<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Plus, Layers } from 'lucide-svelte';
	import ProjectCard from '$components/projects/ProjectCard.svelte';
	import ProjectSearchBar from '$components/projects/ProjectSearchBar.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import BannerConfirm from '$components/ui/BannerConfirm.svelte';
	import type { ProjectOverview } from '$lib/types';

	let projects: ProjectOverview[] = [];
	let isLoading = true;
	let error = '';
	// Exklusiv-Zustand für das Kontextmenü: nur eine Projekt-Card zeigt ihr
	// Menü gleichzeitig — Öffnen einer anderen Card schließt die vorherige.
	let openMenuProjectId: number | null = null;

	// Ticket #497: Suchstring + Aktiv/Archiviert-Sicht über der Liste.
	let searchQuery = '';
	let view: 'active' | 'archived' = 'active';

	// Das Backend kennt `projects.archived` noch nicht (folgt in #498/#501).
	// Bis dahin filtert die Archiv-Sicht auf ein Feld, das nie gesetzt ist —
	// sie zeigt also bewusst immer den EmptyState.
	$: viewFiltered = view === 'archived'
		? projects.filter((p) => (p as any).archived === true)
		: projects;

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

	// No-op-Callback — der Archivieren-Flow folgt in #498.
	function handleArchive(_id: number) {}

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

	onMount(fetchProjects);
</script>

<div class="w-full space-y-8">
	<!-- Header -->
	<div class="flex items-end justify-between gap-4" in:fly={{ y: -16, duration: 400, easing: quintOut }}>
		<div>
			<div class="flex items-center gap-3 mb-1">
				<div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: color-mix(in srgb, var(--color-primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);">
					<Layers class="w-5 h-5" style="color: var(--primary);" />
				</div>
				<h1 class="text-2xl font-semibold tracking-tight" style="color: var(--text);">Projekte</h1>
			</div>
			<p class="ml-12 text-sm" style="color: var(--text-muted);">
				{projects.length} Projekt{projects.length !== 1 ? 'e' : ''} · Kanban-Boards
			</p>
		</div>
		<button onclick={() => goto('/projects/new')} class="btn btn-primary flex items-center gap-2 shrink-0">
			<Plus class="w-4 h-4" />
			Neues Projekt
		</button>
	</div>

	{#if error}
		<div class="p-4 rounded-xl text-sm" style="background: rgba(239,68,68,0.08); border-left: 2px solid var(--color-danger); color: var(--danger);" in:fly={{ y: 8, duration: 200 }}>
			{error}
		</div>
	{/if}

	{#if !isLoading && projects.length > 0}
		<ProjectSearchBar bind:query={searchQuery} bind:view />
	{/if}

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4">
			<div class="relative w-10 h-10">
				<div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
					style="border-top-color: var(--primary);"></div>
			</div>
		</div>

	{:else if projects.length === 0}
		<div in:fade={{ duration: 300 }}>
			<EmptyState>
				<button onclick={() => goto('/projects/new')} class="btn btn-primary mt-4">
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
