<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { z } from 'zod';
	import { ArrowLeft, Settings, Trash2, Check } from 'lucide-svelte';
	import type { Project } from '$lib/types';

	$: id = $page.params.id;

	let project: Project | null = null;
	let name = '';
	let description = '';
	let isLoading = true;
	let isSaving = false;
	let isDeleting = false;
	let error = '';
	let saved = false;

	async function fetchProject() {
		try {
			isLoading = true;
			const res = await fetch(`/api/projects/${id}`);
			const result = await res.json();
			if (result.ok) { project = result.data; name = project!.name; description = project!.description || ''; }
			else error = result.error || 'Projekt nicht gefunden';
		} catch { error = 'Netzwerkfehler'; }
		finally { isLoading = false; }
	}

	const schema = z.object({
		name: z.string().min(1, 'Name ist erforderlich'),
		description: z.string().nullable().optional()
	});

	async function handleSubmit() {
		const v = schema.safeParse({ name, description });
		if (!v.success) { error = v.error.errors[0].message; return; }
		isSaving = true; error = '';
		try {
			const res = await fetch(`/api/projects/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, description })
			});
			const result = await res.json();
			if (result.ok) { project = result.data; saved = true; setTimeout(() => saved = false, 2000); }
			else error = result.error || 'Fehler beim Speichern';
		} catch { error = 'Netzwerkfehler'; }
		finally { isSaving = false; }
	}

	async function handleDelete() {
		if (!confirm(`Projekt "${project?.name}" wirklich löschen? Alle Daten gehen unwiderruflich verloren.`)) return;
		isDeleting = true;
		try {
			const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) goto('/projects?success=Projekt+gelöscht');
			else error = result.error || 'Fehler beim Löschen';
		} catch { error = 'Netzwerkfehler'; }
		finally { isDeleting = false; }
	}

	onMount(fetchProject);
</script>

<div class="w-full max-w-2xl">
	<button
		onclick={() => goto(`/projects/${id}`)}
		class="inline-flex items-center gap-2 mb-6 text-sm transition-all duration-200 group"
		style="color: var(--text-muted);"
		in:fly={{ y: -12, duration: 300, easing: quintOut }}
	>
		<ArrowLeft class="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
		Zurück zum Board
	</button>

	{#if isLoading}
		<div class="flex justify-center py-24">
			<div class="relative w-10 h-10">
				<div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
					style="border-top-color: var(--primary);"></div>
			</div>
		</div>
	{:else if project}
		<div in:fly={{ y: 20, duration: 400, easing: quintOut }}>
			<!-- Header -->
			<div class="flex items-center gap-3 mb-8">
				<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
					style="background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.3);">
					<Settings class="w-5 h-5" style="color: var(--accent);" />
				</div>
				<div>
					<h1 class="text-2xl font-bold tracking-tight" style="color: var(--text);">Projekt-Einstellungen</h1>
					<code class="text-sm" style="color: var(--text-muted);">{project.slug}</code>
				</div>
			</div>

			<!-- Form -->
			<div class="rounded-2xl p-6 mb-6" style="background: var(--card-bg); border: 1px solid var(--border); box-shadow: 0 0 40px rgba(0,0,0,0.3);">
				<h2 class="text-base font-semibold mb-5" style="color: var(--text);">Grundinformationen</h2>
				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium mb-2" style="color: var(--text);">Name *</label>
						<input type="text" bind:value={name} class="input" />
					</div>
					<div>
						<label class="block text-sm font-medium mb-2" style="color: var(--text);">Beschreibung</label>
						<textarea bind:value={description} class="input resize-none" rows="3"></textarea>
					</div>
					<div>
						<label class="block text-sm font-medium mb-2" style="color: var(--text-muted);">
							Slug <span class="text-xs opacity-60">(nicht änderbar)</span>
						</label>
						<input type="text" value={project.slug} disabled class="input opacity-40 cursor-not-allowed" />
					</div>
				</div>

				{#if error}
					<div class="mt-4 p-3 rounded-lg text-sm" style="background: rgba(255,34,85,0.08); border: 1px solid rgba(255,34,85,0.3); color: var(--danger);">{error}</div>
				{/if}

				<div class="flex gap-3 mt-6">
					<button onclick={() => goto(`/projects/${id}`)} class="btn btn-ghost">Abbrechen</button>
					<button onclick={handleSubmit} disabled={isSaving}
						class="btn btn-primary flex items-center gap-2 flex-1 justify-center">
						{#if isSaving}
							<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
							Speichern…
						{:else if saved}
							<Check class="w-4 h-4" /> Gespeichert
						{:else}
							Änderungen speichern
						{/if}
					</button>
				</div>
			</div>

			<!-- Danger Zone -->
			<div class="rounded-2xl p-6" style="background: var(--card-bg); border: 1px solid rgba(255,34,85,0.25);">
				<h2 class="text-base font-semibold mb-1" style="color: var(--danger);">Gefahrenbereich</h2>
				<p class="text-sm mb-5" style="color: var(--text-muted);">
					Alle Statuses, Tickets, Tasks und Kommentare werden unwiderruflich gelöscht.
				</p>
				<button onclick={handleDelete} disabled={isDeleting}
					class="btn btn-danger flex items-center gap-2">
					{#if isDeleting}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Löschen…
					{:else}
						<Trash2 class="w-4 h-4" /> Projekt löschen
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>
