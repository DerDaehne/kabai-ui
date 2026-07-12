<script lang="ts">
	import { goto } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { z } from 'zod';
	import { ArrowLeft, Plus } from 'lucide-svelte';

	let name = '';
	let slug = '';
	let description = '';
	let error = '';
	let isLoading = false;
	let slugManual = false;

	$: if (name && !slugManual) {
		slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
	}

	const schema = z.object({
		name: z.string().min(1, 'Name ist erforderlich'),
		slug: z.string().min(1, 'Slug ist erforderlich').regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und Bindestriche'),
		description: z.string().optional()
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		const v = schema.safeParse({ name, slug, description });
		if (!v.success) { error = v.error.errors[0].message; return; }
		error = ''; isLoading = true;
		try {
			const res = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, slug, description })
			});
			const result = await res.json();
			if (!result.ok) { error = result.error || 'Fehler beim Erstellen'; return; }
			goto('/projects?success=Projekt+erstellt');
		} catch { error = 'Netzwerkfehler'; }
		finally { isLoading = false; }
	}
</script>

<div class="w-full max-w-2xl">
	<button
		onclick={() => goto('/projects')}
		class="inline-flex items-center gap-2 mb-6 text-sm transition-all duration-200 group"
		style="color: var(--text-muted);"
		in:fly={{ y: -12, duration: 300, easing: quintOut }}
	>
		<ArrowLeft class="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
		Zurück zu Projekten
	</button>

	<div in:fly={{ y: 20, duration: 400, easing: quintOut }}>
		<div class="flex items-center gap-3 mb-8">
			<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
				style="background: color-mix(in srgb, var(--color-primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);">
				<Plus class="w-5 h-5" style="color: var(--primary);" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight" style="color: var(--text);">Neues Projekt</h1>
				<p class="text-sm" style="color: var(--text-muted);">Kanban-Board erstellen</p>
			</div>
		</div>

		<div class="rounded-2xl p-6 card">
			<form onsubmit={handleSubmit} class="space-y-5">
				<div>
					<label class="block text-sm font-medium mb-2" style="color: var(--text);">Name *</label>
					<input type="text" bind:value={name} class="input" placeholder="z.B. Website-Relaunch" autofocus required />
				</div>
				<div>
					<label class="block text-sm font-medium mb-2" style="color: var(--text);">Slug *</label>
					<input type="text" bind:value={slug} oninput={() => slugManual = true} class="input font-mono" placeholder="website-relaunch" required />
					<p class="mt-1 text-xs" style="color: var(--text-muted);">Nur Kleinbuchstaben, Zahlen und Bindestriche — wird automatisch generiert.</p>
				</div>
				<div>
					<label class="block text-sm font-medium mb-2" style="color: var(--text);">
						Beschreibung <span class="text-xs" style="color: var(--text-muted);">(optional)</span>
					</label>
					<textarea bind:value={description} class="input resize-none" rows="3" placeholder="Kurze Beschreibung…"></textarea>
				</div>

				{#if error}
					<div class="p-3 rounded-lg text-sm" style="background: rgba(239,68,68,0.08); border-left: 2px solid var(--color-danger); color: var(--danger);">{error}</div>
				{/if}

				<div class="flex gap-3 pt-2">
					<button type="button" onclick={() => goto('/projects')} class="btn btn-ghost">Abbrechen</button>
					<button type="submit" disabled={isLoading || !name || !slug}
						class="btn btn-primary flex items-center gap-2 flex-1 justify-center">
						{#if isLoading}
							<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
							Erstellen…
						{:else}
							<Plus class="w-4 h-4" /> Projekt erstellen
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
