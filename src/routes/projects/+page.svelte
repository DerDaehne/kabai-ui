<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Plus, Settings, Trash2, ExternalLink, Layers } from 'lucide-svelte';
	import type { Project } from '$lib/types';

	let projects: Project[] = [];
	let isLoading = true;
	let error = '';

	async function fetchProjects() {
		try {
			isLoading = true;
			const res = await fetch('/api/projects');
			const result = await res.json();
			if (result.ok) projects = result.data;
			else error = result.error || 'Fehler beim Laden';
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	async function handleDelete(projectId: number, name: string) {
		if (!confirm(`Projekt "${name}" wirklich löschen? Alle Daten gehen verloren.`)) return;
		try {
			const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) projects = projects.filter(p => p.id !== projectId);
			else alert(result.error || 'Fehler beim Löschen');
		} catch {
			alert('Netzwerkfehler');
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
				<h1 class="text-2xl font-bold tracking-tight" style="color: var(--text);">Projekte</h1>
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
		<div class="flex flex-col items-center justify-center py-24 rounded-2xl card" in:fade={{ duration: 300 }}>
			<div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style="background: color-mix(in srgb, var(--color-primary) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);">
				<Layers class="w-8 h-8" style="color: var(--text-muted);" />
			</div>
			<h3 class="text-lg font-semibold mb-2" style="color: var(--text);">Noch keine Projekte</h3>
			<p class="mb-6 text-sm" style="color: var(--text-muted);">Erstellen Sie Ihr erstes Projekt, um loszulegen.</p>
			<button onclick={() => goto('/projects/new')} class="btn btn-primary">
				Erstes Projekt erstellen
			</button>
		</div>

	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each projects as project, i (project.id)}
				<div
					in:fly={{ y: 24, duration: 350, delay: i * 50, easing: quintOut }}
					class="group rounded-xl p-5 card cursor-pointer"
					onclick={() => goto(`/projects/${project.id}`)}
				>
					<div class="flex items-start justify-between mb-3">
						<div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
							style="background: var(--color-surface-hover); color: var(--color-text-secondary); border: 1px solid var(--color-border);">
							{project.name.charAt(0).toUpperCase()}
						</div>
						<!-- Actions (shown on hover) -->
						<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onclick={(e) => e.stopPropagation()}>
							<button
								onclick={() => goto(`/projects/${project.id}/settings`)}
								class="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
								style="color: var(--text-muted);"
								onmouseenter={(e) => { e.currentTarget.style.background = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text)'; }}
								onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
								title="Einstellungen"
							>
								<Settings class="w-3.5 h-3.5" />
							</button>
							<button
								onclick={() => handleDelete(project.id, project.name)}
								class="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
								style="color: var(--danger);"
								onmouseenter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
								onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; }}
								title="Löschen"
							>
								<Trash2 class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<h3 class="font-semibold truncate mb-1" style="color: var(--text);">{project.name}</h3>
					<code class="text-xs" style="color: var(--text-muted);">{project.slug}</code>
					{#if project.description}
						<p class="text-xs mt-2 truncate-2" style="color: var(--text-muted);">{project.description}</p>
					{/if}

					<div class="mt-4 mb-3 hairline"></div>
					<div class="flex items-center justify-between">
						<span class="text-xs" style="color: var(--text-muted);">
							{new Date(project.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
						</span>
						<div class="flex items-center gap-1 text-xs" style="color: var(--text-muted);">
							<ExternalLink class="w-3 h-3" />
							Board
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
