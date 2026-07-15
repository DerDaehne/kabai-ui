<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Plus, Layers, AlertCircle, Zap, Hourglass, BookOpen } from 'lucide-svelte';
	import StatusPie from '$components/projects/StatusPie.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import type { ProjectOverview } from '$lib/types';

	let projects: ProjectOverview[] = [];
	let isLoading = true;
	let error = '';

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

	function relativeTime(iso: string): string {
		const diffMs = Date.now() - new Date(iso).getTime();
		const mins = Math.round(diffMs / 60000);
		if (mins < 1) return 'gerade eben';
		if (mins < 60) return `vor ${mins} Min.`;
		const hours = Math.round(mins / 60);
		if (hours < 24) return `vor ${hours} Std.`;
		const days = Math.round(hours / 24);
		return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
	}

	function ageInDays(iso: string): string {
		const diffMs = Date.now() - new Date(iso).getTime();
		const days = Math.floor(diffMs / 86400000);
		if (days < 1) return '<1 Tag';
		return `${days} Tag${days !== 1 ? 'en' : ''}`;
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
				<div
					in:fly={{ y: 24, duration: 350, delay: i * 50, easing: quintOut }}
					class="card cursor-pointer py-5 px-6 flex items-center gap-6"
					role="button"
					tabindex="0"
					onclick={() => goto(`/projects/${project.id}`)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goto(`/projects/${project.id}`); } }}
				>
					<!-- Titel + Beschreibung -->
					<div class="min-w-0 flex-1">
						<h3 class="text-lg font-semibold truncate" style="color: var(--color-text);" title={project.name}>
							{project.name}
						</h3>
						{#if project.description}
							<p class="text-sm mt-1 truncate-2" style="color: var(--color-text-secondary);" title={project.description}>
								{project.description}
							</p>
						{:else}
							<code class="text-xs" style="color: var(--color-text-secondary);">{project.slug}</code>
						{/if}
					</div>

					<!-- Metriken: gestaffelt nach Breakpoint ausgeblendet.
					     Wegfall-Reihenfolge klein→groß: (a) zuerst weg, (e) zuletzt. -->
					<div class="hidden 2xl:flex flex-col items-end shrink-0 w-28">
						<span class="text-caption" style="color: var(--color-text-secondary);">Letzte Bearbeitung</span>
						<span class="text-sm font-mono" style="color: var(--color-text);">{relativeTime(project.last_activity)}</span>
					</div>

					<div class="hidden xl:flex flex-col items-end shrink-0 w-28">
						<span class="text-caption" style="color: var(--color-text-secondary);">Wartet auf Mensch</span>
						<span class="font-mono text-sm flex items-center gap-1.5"
							style="color: {project.waiting_on_human > 0 ? 'var(--color-warning)' : 'var(--color-text)'};">
							{#if project.waiting_on_human > 0}
								<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background: var(--color-warning);"></span>
							{:else}
								<AlertCircle class="w-3 h-3" style="color: var(--color-text-secondary);" />
							{/if}
							{project.waiting_on_human}
						</span>
					</div>

					<div class="hidden lg:flex flex-col items-end shrink-0 w-24">
						<span class="text-caption" style="color: var(--color-text-secondary);">Durchsatz 7T</span>
						<span class="font-mono text-sm flex items-center gap-1" style="color: var(--color-text);">
							<Zap class="w-3 h-3" style="color: var(--color-text-secondary);" />{project.throughput_7d}
						</span>
					</div>

					<div class="hidden md:flex flex-col items-end shrink-0 w-24">
						<span class="text-caption" style="color: var(--color-text-secondary);">Ältestes offen</span>
						<span class="font-mono text-sm flex items-center gap-1" style="color: var(--color-text);">
							<Hourglass class="w-3 h-3" style="color: var(--color-text-secondary);" />
							{project.oldest_open_created_at ? ageInDays(project.oldest_open_created_at) : '–'}
						</span>
					</div>

					<div class="hidden sm:flex flex-col items-end shrink-0 w-24">
						<span class="text-caption" style="color: var(--color-text-secondary);">KB-Notes</span>
						<span class="font-mono text-sm flex items-center gap-1" style="color: var(--color-text);">
							<BookOpen class="w-3 h-3" style="color: var(--color-text-secondary);" />{project.notes_count}
						</span>
					</div>

					<!-- Tortendiagramm -->
					<div class="shrink-0">
						<StatusPie statuses={project.statuses} size={80} />
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
