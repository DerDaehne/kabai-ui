<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Plus, Layers } from 'lucide-svelte';
	import ProjectCard from '$components/projects/ProjectCard.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import type { ProjectOverview } from '$lib/types';

	let projects: ProjectOverview[] = [];
	let isLoading = true;
	let error = '';
	// Exklusiv-Zustand für das Kontextmenü: nur eine Projekt-Card zeigt ihr
	// Menü gleichzeitig — Öffnen einer anderen Card schließt die vorherige.
	let openMenuProjectId: number | null = null;

	function handleRequestOpen(id: number) {
		openMenuProjectId = id;
	}

	function handleRequestClose() {
		openMenuProjectId = null;
	}

	// No-op-Callbacks — die eigentlichen Lösch-/Archivieren-Flows folgen in #496/#498.
	function handleDelete(_id: number) {}
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

	{:else}
		<div class="flex flex-col gap-3">
			{#each projects as project, i (project.id)}
				<div in:fly={{ y: 24, duration: 350, delay: i * 50, easing: quintOut }}>
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
