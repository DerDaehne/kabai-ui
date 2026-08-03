<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Plus, Layers } from 'lucide-svelte';
	import ProjectCard from '$components/projects/ProjectCard.svelte';
	import ProjectSearchBar from '$components/projects/ProjectSearchBar.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import BannerConfirm from '$components/ui/BannerConfirm.svelte';
	import BottomSheet from '$components/ui/BottomSheet.svelte';
	import NewProjectSheet from '$components/projects/NewProjectSheet.svelte';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';
	import type { ProjectOverview } from '$lib/types';
	import { focusSearchField, paletteActions } from '$lib/stores/commandPalette';

	let projects: ProjectOverview[] = [];
	let isLoading = true;
	let error = '';
	// Exklusiv-Zustand für das Kontextmenü: nur eine Projekt-Card zeigt ihr
	// Menü gleichzeitig — Öffnen einer anderen Card schließt die vorherige.
	let openMenuProjectId: number | null = null;

	// Ticket #497: Suchstring + Aktiv/Archiviert-Sicht über der Liste.
	let searchQuery = '';
	let view: 'active' | 'archived' = 'active';
	let searchBar: ProjectSearchBar | null = null;

	$: viewFiltered = view === 'archived'
		? projects.filter((p) => p.archived)
		: projects.filter((p) => !p.archived);

	$: filteredProjects = (() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return viewFiltered;
		return viewFiltered.filter((p) =>
			p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
		);
	})();

	// Ticket #496: Lösch-Flow über das Band-Popup (BannerConfirm).
	let deleteTargetId: number | null = null;
	let deleteTargetName = '';
	let isDeleting = false;

	function handleRequestOpen(id: number) {
		openMenuProjectId = id;
	}

	function handleRequestClose() {
		openMenuProjectId = null;
	}

	function handleDelete(id: number) {
		const project = projects.find((p) => p.id === id);
		deleteTargetId = id;
		deleteTargetName = project?.name ?? '';
	}

	function cancelDelete() {
		deleteTargetId = null;
		deleteTargetName = '';
	}

	async function confirmDelete() {
		if (deleteTargetId === null || isDeleting) return;
		const id = deleteTargetId;
		isDeleting = true;
		try {
			const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) {
				projects = projects.filter((p) => p.id !== id);
				openMenuProjectId = null;
				deleteTargetId = null;
				deleteTargetName = '';
			} else {
				error = result.error || 'Fehler beim Löschen';
				deleteTargetId = null;
				deleteTargetName = '';
			}
		} catch {
			error = 'Netzwerkfehler';
			deleteTargetId = null;
			deleteTargetName = '';
		} finally {
			isDeleting = false;
		}
	}

	// Ticket #498: Archivieren/Reaktivieren über dasselbe Band-Popup-Muster wie
	// Löschen (#496), nur mit tone="warning" (gelb statt rot) und ohne Löschung
	// — es wird nur projects.archived umgeschaltet.
	let archiveTargetId: number | null = null;
	let archiveTargetName = '';
	let archiveTargetIsArchived = false;
	let isArchiving = false;

	function handleArchive(id: number) {
		const project = projects.find((p) => p.id === id);
		archiveTargetId = id;
		archiveTargetName = project?.name ?? '';
		archiveTargetIsArchived = project?.archived ?? false;
	}

	function cancelArchive() {
		archiveTargetId = null;
		archiveTargetName = '';
	}

	async function confirmArchive() {
		if (archiveTargetId === null || isArchiving) return;
		const id = archiveTargetId;
		const nextArchived = !archiveTargetIsArchived;
		isArchiving = true;
		try {
			const res = await fetch(`/api/projects/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ archived: nextArchived })
			});
			const result = await res.json();
			if (result.ok) {
				projects = projects.map((p) => (p.id === id ? { ...p, archived: nextArchived } : p));
				openMenuProjectId = null;
			} else {
				error = result.error || 'Fehler beim Archivieren';
			}
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isArchiving = false;
			archiveTargetId = null;
			archiveTargetName = '';
		}
	}

	// Ticket #506: "Neues Projekt" öffnet jetzt das von unten hereingeschobene
	// BottomSheet statt zur Route /projects/new zu navigieren. Die Route bleibt
	// als Deep-Link erhalten (siehe src/routes/projects/new/+page.svelte).
	let showNewProjectSheet = false;

	function openNewProjectSheet() {
		showNewProjectSheet = true;
	}

	function closeNewProjectSheet() {
		showNewProjectSheet = false;
	}

	function handleProjectCreated(_project: { id: number }) {
		closeNewProjectSheet();
		fetchProjects();
	}

	async function fetchProjects() {
		try {
			isLoading = true;
			const res = await fetch('/api/projects/overview');
			const result = await res.json();
			if (result.ok) projects = result.data;
			else error = result.error || 'Fehler beim Laden';
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	// Ticket #537: registriert Suchfeld + "Neues Projekt"-Aktion dieser Seite
	// beim globalen "/"-/":"-Shortcut (Root-Layout); Abmeldung beim Verlassen.
	// Die ProjectSearchBar rendert ihr Suchfeld nur, wenn Projekte vorhanden
	// sind — ist sie (noch) nicht im DOM, ist "/" dann ein No-op.
	function focusSearch() {
		searchBar?.focus();
	}

	function toggleView() {
		view = view === 'active' ? 'archived' : 'active';
	}

	onMount(() => {
		fetchProjects();
		focusSearchField.set(focusSearch);
		paletteActions.set([
			{ id: 'new-project', label: 'Neues Projekt', run: openNewProjectSheet },
			{ id: 'toggle-view', label: 'Aktiv/Archiviert umschalten', run: toggleView }
		]);
	});

	onDestroy(() => {
		focusSearchField.set(null);
		paletteActions.set([]);
	});
</script>

<div class="w-full space-y-8">
	<!-- Kopfzeile (Rework #497): Headline auf ein Minimum reduziert, die
	     Suchleiste ist das zentrale Element und sitzt mittig auf gleicher
	     Höhe wie Headline und Primäraktion. Der große Abstand nach unten
	     setzt die Suche deutlich von der Projektliste ab (der Sicht-Tropfen
	     hängt zusätzlich ~24px unter die Pille). -->
	<div class="flex items-center gap-6" style="margin-bottom: 56px;" in:fly={{ y: -16, duration: 400, easing: quintOut }}>
		<div class="flex items-center gap-2 shrink-0">
			<Layers class="w-4 h-4" style="color: var(--primary);" />
			<h1 class="text-base font-semibold tracking-tight" style="color: var(--text);">Projekte</h1>
			<span class="text-sm font-mono" style="color: var(--text-muted);">{projects.length}</span>
		</div>
		<div class="flex-1 min-w-0 flex justify-center">
			{#if !isLoading && projects.length > 0}
				<ProjectSearchBar bind:this={searchBar} bind:query={searchQuery} bind:view />
			{/if}
		</div>
		<button onclick={openNewProjectSheet} class="btn btn-primary flex items-center gap-2 shrink-0">
			<Plus class="w-4 h-4" />
			Neues Projekt
		</button>
	</div>

	{#if error}
		<ErrorBanner message={error} />
	{/if}

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4">
			<Spinner />
		</div>

	{:else if projects.length === 0}
		<div in:fade={{ duration: 300 }}>
			<EmptyState>
				<button onclick={openNewProjectSheet} class="btn btn-primary mt-4">
					Erstes Projekt erstellen
				</button>
			</EmptyState>
		</div>

	{:else if filteredProjects.length === 0}
		<div in:fade={{ duration: 300 }}>
			<EmptyState />
		</div>

	{:else}
		<div class="flex flex-col gap-3">
			<!-- Gestaffeltes delay bleibt fürs Erstladen, aber gedeckelt (Math.min),
			     damit Such-/Sicht-Wechsel nicht träge wirken. -->
			{#each filteredProjects as project, i (project.id)}
				<div
					in:fly={{ y: 16, duration: 250, delay: Math.min(i, 8) * 40, easing: quintOut }}
					out:fade={{ duration: 150 }}
				>
					<ProjectCard
						{project}
						isMenuOpen={openMenuProjectId === project.id}
						onOpen={(id) => goto(`/projects/${id}`)}
						onDelete={handleDelete}
						onArchive={handleArchive}
						onRequestOpen={handleRequestOpen}
						onRequestClose={handleRequestClose}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>

<BannerConfirm
	open={deleteTargetId !== null}
	text={`Projekt „${deleteTargetName}" wirklich löschen?`}
	tone="danger"
	onConfirm={confirmDelete}
	onCancel={cancelDelete}
/>

<BannerConfirm
	open={archiveTargetId !== null}
	text={archiveTargetIsArchived
		? `Projekt „${archiveTargetName}" wieder aktivieren?`
		: `Projekt „${archiveTargetName}" archivieren?`}
	tone="warning"
	onConfirm={confirmArchive}
	onCancel={cancelArchive}
/>

<BottomSheet open={showNewProjectSheet} title="Neues Projekt" onClose={closeNewProjectSheet}>
	<NewProjectSheet onCreated={handleProjectCreated} onCancel={closeNewProjectSheet} />
</BottomSheet>
