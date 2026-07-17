<script lang="ts">
	// Ticket #506: Formular aus src/routes/projects/new/+page.svelte extrahiert,
	// Markup/Logik weitgehend unverändert übernommen — läuft jetzt im BottomSheet
	// statt auf einer eigenen Route. onCreated wird nach erfolgreichem Anlegen
	// aufgerufen (Aufrufer entscheidet über Navigation/Refresh + Exit-Animation).
	import { z } from 'zod';
	import { Plus } from 'lucide-svelte';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';
	import FormField from '$components/ui/FormField.svelte';

	export let onCreated: (project: { id: number }) => void = () => {};
	export let onCancel: () => void = () => {};

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
			onCreated(result.data);
		} catch { error = 'Netzwerkfehler'; }
		finally { isLoading = false; }
	}
</script>

<form onsubmit={handleSubmit} class="space-y-5">
	<FormField label="Name" required>
		<input type="text" bind:value={name} class="input" placeholder="z.B. Website-Relaunch" autofocus required />
	</FormField>

	<FormField label="Slug" required hint="Nur Kleinbuchstaben, Zahlen und Bindestriche — wird automatisch generiert.">
		<input type="text" bind:value={slug} oninput={() => slugManual = true} class="input font-mono" placeholder="website-relaunch" required />
	</FormField>

	<div>
		<label class="block text-sm font-medium mb-2" style="color: var(--text);">
			Beschreibung <span class="text-xs" style="color: var(--text-muted);">(optional)</span>
		</label>
		<textarea bind:value={description} class="input resize-none" rows="3" placeholder="Kurze Beschreibung…"></textarea>
	</div>

	{#if error}
		<ErrorBanner message={error} compact />
	{/if}

	<div class="flex gap-3 pt-2">
		<button type="button" onclick={onCancel} class="btn btn-ghost">Abbrechen</button>
		<button type="submit" disabled={isLoading || !name || !slug}
			class="btn btn-primary flex items-center gap-2 flex-1 justify-center">
			{#if isLoading}
				<Spinner size={4} color="black" thickness="border-2" />
				Erstellen…
			{:else}
				<Plus class="w-4 h-4" /> Projekt erstellen
			{/if}
		</button>
	</div>
</form>
