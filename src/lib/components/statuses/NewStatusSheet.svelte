<script lang="ts">
	// Ticket #506: Formular aus src/routes/projects/[id]/statuses/new/+page.svelte
	// extrahiert, Markup/Logik weitgehend unverändert übernommen — läuft jetzt im
	// BottomSheet statt auf einer eigenen Route. onCreated wird nach erfolgreichem
	// Anlegen aufgerufen (Aufrufer entscheidet über Navigation/Refresh + Exit-Animation).
	import { z } from 'zod';
	import { Plus, Bot } from 'lucide-svelte';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';

	export let projectId: string;
	export let onCreated: (status: { id: number }) => void = () => {};
	export let onCancel: () => void = () => {};

	let display_name = '';
	let name = '';
	let position = 0;
	let agent_role_instruction = '';
	let error = '';
	let isLoading = false;
	let nameManuallyEdited = false;

	const createStatusSchema = z.object({
		name: z.string()
			.min(1, 'Name ist erforderlich')
			.regex(/^[a-z0-9_]+$/, 'Nur Kleinbuchstaben, Zahlen und Unterstriche erlaubt'),
		display_name: z.string().min(1, 'Anzeigename ist erforderlich'),
		position: z.number().int().min(0),
		agent_role_instruction: z.string().optional()
	});

	$: if (display_name && !nameManuallyEdited) {
		name = display_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		const validation = createStatusSchema.safeParse({ name, display_name, position, agent_role_instruction });
		if (!validation.success) {
			error = validation.error.errors[0].message;
			return;
		}
		error = '';
		isLoading = true;
		try {
			const res = await fetch(`/api/projects/${projectId}/statuses`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, display_name, position, agent_role_instruction: agent_role_instruction || null })
			});
			const result = await res.json();
			if (!result.ok) {
				error = result.error || 'Fehler beim Erstellen';
				return;
			}
			onCreated(result.data);
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-5">
	<!-- Display Name -->
	<div>
		<label class="block text-sm font-medium mb-2" style="color: var(--text);">
			Anzeigename <span style="color: var(--danger);">*</span>
		</label>
		<input
			type="text"
			bind:value={display_name}
			class="input"
			placeholder="z.B. In Bearbeitung, Fertig, Blockiert"
			autofocus
			required
		/>
	</div>

	<!-- Code Name -->
	<div>
		<label class="block text-sm font-medium mb-2" style="color: var(--text);">
			Code-Name <span style="color: var(--danger);">*</span>
		</label>
		<input
			type="text"
			bind:value={name}
			oninput={() => nameManuallyEdited = true}
			class="input font-mono"
			placeholder="in_progress"
			required
		/>
		<p class="mt-1 text-xs" style="color: var(--text-muted);">
			Nur Kleinbuchstaben, Zahlen, Unterstriche — wird automatisch generiert.
		</p>
	</div>

	<!-- Position -->
	<div>
		<label class="block text-sm font-medium mb-2" style="color: var(--text);">Position</label>
		<input
			type="number"
			bind:value={position}
			class="input"
			min="0"
		/>
		<p class="mt-1 text-xs" style="color: var(--text-muted);">Reihenfolge im Board (0 = ganz links).</p>
	</div>

	<!-- Agent Instruction -->
	<div>
		<label class="block text-sm font-medium mb-2 flex items-center gap-2" style="color: var(--text);">
			<Bot class="w-4 h-4" style="color: var(--accent);" />
			Agent-Instruktion
			<span class="text-xs" style="color: var(--text-muted);">(optional)</span>
		</label>
		<textarea
			bind:value={agent_role_instruction}
			class="input resize-none"
			rows="3"
			placeholder="Beschreiben Sie, welche Rolle der Agent in diesem Status hat…"
		></textarea>
	</div>

	{#if error}
		<ErrorBanner message={error} compact />
	{/if}

	<div class="flex gap-3 pt-2">
		<button type="button" onclick={onCancel} class="btn btn-ghost">
			Abbrechen
		</button>
		<button
			type="submit"
			disabled={isLoading || !display_name || !name}
			class="btn btn-primary flex items-center gap-2 flex-1 justify-center"
		>
			{#if isLoading}
				<Spinner size={4} color="black" thickness="border-2" />
				Erstellen…
			{:else}
				<Plus class="w-4 h-4" />
				Status erstellen
			{/if}
		</button>
	</div>
</form>
