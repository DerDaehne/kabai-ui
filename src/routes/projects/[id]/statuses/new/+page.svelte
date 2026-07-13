<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { z } from 'zod';
	import { ArrowLeft, Plus, Bot } from 'lucide-svelte';

	let display_name = '';
	let name = '';
	let position = 0;
	let agent_role_instruction = '';
	let error = '';
	let isLoading = false;
	let nameManuallyEdited = false;

	$: id = $page.params.id;

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
			const res = await fetch(`/api/projects/${id}/statuses`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, display_name, position, agent_role_instruction: agent_role_instruction || null })
			});
			const result = await res.json();
			if (!result.ok) {
				error = result.error || 'Fehler beim Erstellen';
				return;
			}
			goto(`/projects/${id}/statuses?success=Status+erstellt`);
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="w-full max-w-2xl">
	<button
		onclick={() => goto(`/projects/${id}/statuses`)}
		class="inline-flex items-center gap-2 mb-6 text-sm transition-all duration-200 group"
		style="color: var(--text-muted);"
		in:fly={{ y: -12, duration: 300, easing: quintOut }}
	>
		<ArrowLeft class="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
		Zurück zu Statuses
	</button>

	<div in:fly={{ y: 20, duration: 400, easing: quintOut }}>
		<!-- Header -->
		<div class="flex items-center gap-3 mb-8">
			<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
				style="background: color-mix(in srgb, var(--color-primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);">
				<Plus class="w-5 h-5" style="color: var(--primary);" />
			</div>
			<div>
				<h1 class="text-2xl font-semibold tracking-tight" style="color: var(--text);">Neuer Status</h1>
				<p class="text-sm" style="color: var(--text-muted);">Erstellen Sie eine neue Board-Spalte</p>
			</div>
		</div>

		<div class="rounded-2xl p-6 card">
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
					<div class="p-3 rounded-lg text-sm" style="background: rgba(239,68,68,0.08); border-left: 2px solid var(--color-danger); color: var(--danger);">
						{error}
					</div>
				{/if}

				<div class="flex gap-3 pt-2">
					<button type="button" onclick={() => goto(`/projects/${id}/statuses`)} class="btn btn-ghost">
						Abbrechen
					</button>
					<button
						type="submit"
						disabled={isLoading || !display_name || !name}
						class="btn btn-primary flex items-center gap-2 flex-1 justify-center"
					>
						{#if isLoading}
							<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
							Erstellen…
						{:else}
							<Plus class="w-4 h-4" />
							Status erstellen
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
