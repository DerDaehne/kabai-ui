<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Plus, Layers } from 'lucide-svelte';
	import CanvasCard from '$components/canvases/CanvasCard.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import BannerConfirm from '$components/ui/BannerConfirm.svelte';
	import BottomSheet from '$components/ui/BottomSheet.svelte';
	import NewCanvasSheet from '$components/canvases/NewCanvasSheet.svelte';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';
	import type { Canvas, Project } from '$lib/types';
	import { focusSearchField, paletteActions } from '$lib/stores/commandPalette';

	// Ticket #526: Canvas-Verwaltungsseite — Liste, Anlegen, Umbenennen,
	// Löschen, Projektverknüpfung. Nach dem Muster von src/routes/+page.svelte
	// (Projects, #494/#497/#506).
	let canvases: Canvas[] = [];
	let allProjects: Project[] = [];
	let isLoading = true;
	let error = '';

	let openMenuCanvasId: number | null = null;

	let searchQuery = '';
	let projectFilter = 'all';
	let searchInputEl: HTMLInputElement | null = null;

	$: filteredCanvases = (() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return canvases;
		return canvases.filter((c) => c.name.toLowerCase().includes(q));
	})();

	let deleteTargetId: number | null = null;
	let deleteTargetName = '';
	let isDeleting = false;

	function handleRequestOpen(id: number) {
		openMenuCanvasId = id;
	}

	function handleRequestClose() {
		openMenuCanvasId = null;
	}

	function handleDelete(id: number) {
		const canvas = canvases.find((c) => c.id === id);
		deleteTargetId = id;
		deleteTargetName = canvas?.name ?? '';
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
			const res = await fetch(`/api/canvases/${id}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) {
				canvases = canvases.filter((c) => c.id !== id);
				openMenuCanvasId = null;
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

	async function handleRename(id: number, name: string): Promise<boolean> {
		try {
			const res = await fetch(`/api/canvases/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			const result = await res.json();
			if (result.ok) {
				canvases = canvases.map((c) => (c.id === id ? result.data : c));
				return true;
			}
			error = result.error || 'Fehler beim Umbenennen';
			return false;
		} catch {
			error = 'Netzwerkfehler';
			return false;
		}
	}

	async function handleLinkProject(canvasId: number, projectId: number) {
		try {
			const res = await fetch(`/api/canvases/${canvasId}/projects`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ project_id: projectId })
			});
			const result = await res.json();
			if (result.ok) {
				canvases = canvases.map((c) =>
					c.id === canvasId ? { ...c, project_ids: [...c.project_ids, projectId] } : c
				);
			} else {
				error = result.error || 'Fehler beim Verknüpfen';
			}
		} catch {
			error = 'Netzwerkfehler';
		}
	}

	async function handleUnlinkProject(canvasId: number, projectId: number) {
		try {
			const res = await fetch(`/api/canvases/${canvasId}/projects`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ project_id: projectId })
			});
			const result = await res.json();
			if (result.ok) {
				canvases = canvases.map((c) =>
					c.id === canvasId ? { ...c, project_ids: c.project_ids.filter((id) => id !== projectId) } : c
				);
			} else {
				error = result.error || 'Fehler beim Lösen der Verknüpfung';
			}
		} catch {
			error = 'Netzwerkfehler';
		}
	}

	let showNewCanvasSheet = false;

	function openNewCanvasSheet() {
		showNewCanvasSheet = true;
	}

	function closeNewCanvasSheet() {
		showNewCanvasSheet = false;
	}

	function handleCanvasCreated(_canvas: { id: number }) {
		closeNewCanvasSheet();
		fetchCanvases();
	}

	async function fetchCanvases() {
		try {
			isLoading = true;
			const params = new URLSearchParams();
			if (projectFilter !== 'all') params.set('project_id', projectFilter);
			const res = await fetch(`/api/canvases?${params}`);
			const result = await res.json();
			if (result.ok) canvases = result.data;
			else error = result.error || 'Fehler beim Laden';
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	async function fetchProjects() {
		try {
			const res = await fetch('/api/projects');
			const result = await res.json();
			if (result.ok) allProjects = result.data;
		} catch {
			// Projekt-Namen sind nur für Badges/Filter — kein Blocker für die Liste.
		}
	}

	function onProjectFilterChange() {
		fetchCanvases();
	}

	// Ticket #537: registriert Suchfeld + "Neues Canvas"-Aktion dieser Seite
	// beim globalen "/"-/":"-Shortcut (Root-Layout); Abmeldung beim Verlassen.
	// Das Suchfeld existiert nur, wenn es Canvases gibt (siehe Markup weiter
	// unten) — falls es (noch) nicht im DOM ist, ist "/" dann ein No-op, genau
	// wie auf Seiten ohne Suchfeld.
	async function focusSearch() {
		await tick();
		searchInputEl?.focus();
		searchInputEl?.select();
	}

	onMount(() => {
		fetchProjects();
		fetchCanvases();
		focusSearchField.set(focusSearch);
		paletteActions.set([{ id: 'new-canvas', label: 'Neues Canvas', run: openNewCanvasSheet }]);
	});

	onDestroy(() => {
		focusSearchField.set(null);
		paletteActions.set([]);
	});
</script>

<div class="w-full space-y-8">
	<div class="flex items-center gap-6" style="margin-bottom: 56px;" in:fly={{ y: -16, duration: 400, easing: quintOut }}>
		<div class="flex items-center gap-2 shrink-0">
			<Layers class="w-4 h-4" style="color: var(--primary);" />
			<h1 class="text-base font-semibold tracking-tight" style="color: var(--text);">Canvases</h1>
			<span class="text-sm font-mono" style="color: var(--text-muted);">{canvases.length}</span>
		</div>

		<div class="flex-1 min-w-0 flex items-center justify-center gap-3">
			{#if !isLoading && (canvases.length > 0 || searchQuery || projectFilter !== 'all')}
				<input
					bind:this={searchInputEl}
					type="text"
					bind:value={searchQuery}
					placeholder="Suchen…"
					class="input w-auto max-w-[280px]"
					aria-label="Canvases durchsuchen"
				/>
				<select bind:value={projectFilter} onchange={onProjectFilterChange} class="input w-auto max-w-[200px]">
					<option value="all">Alle Projekte</option>
					{#each allProjects as p (p.id)}
						<option value={String(p.id)}>{p.name}</option>
					{/each}
				</select>
			{/if}
		</div>

		<button onclick={openNewCanvasSheet} class="btn btn-primary flex items-center gap-2 shrink-0">
			<Plus class="w-4 h-4" />
			Neues Canvas
		</button>
	</div>

	{#if error}
		<ErrorBanner message={error} />
	{/if}

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4">
			<Spinner />
		</div>
	{:else if canvases.length === 0}
		<div in:fade={{ duration: 300 }}>
			<EmptyState>
				<button onclick={openNewCanvasSheet} class="btn btn-primary mt-4">
					Erstes Canvas erstellen
				</button>
			</EmptyState>
		</div>
	{:else if filteredCanvases.length === 0}
		<div in:fade={{ duration: 300 }}>
			<EmptyState />
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			{#each filteredCanvases as canvas, i (canvas.id)}
				<div
					in:fly={{ y: 16, duration: 250, delay: Math.min(i, 8) * 40, easing: quintOut }}
					out:fade={{ duration: 150 }}
				>
					<CanvasCard
						{canvas}
						{allProjects}
						isMenuOpen={openMenuCanvasId === canvas.id}
						onDelete={handleDelete}
						onRename={handleRename}
						onLinkProject={handleLinkProject}
						onUnlinkProject={handleUnlinkProject}
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
	text={`Canvas „${deleteTargetName}" wirklich löschen?`}
	tone="danger"
	onConfirm={confirmDelete}
	onCancel={cancelDelete}
/>

<BottomSheet open={showNewCanvasSheet} title="Neues Canvas" onClose={closeNewCanvasSheet}>
	<NewCanvasSheet onCreated={handleCanvasCreated} onCancel={closeNewCanvasSheet} />
</BottomSheet>
