<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { z } from 'zod';
	import { ArrowLeft } from 'lucide-svelte';
	import type { BoardStatus } from '$lib/types';

	let display_name = '';
	let name = '';
	let position = 0;
	let agent_role_instruction = '';
	let error = '';
	let isLoading = false;

	$: id = $page.params.id;

	// Validierung
	const createStatusSchema = z.object({
		name: z.string()
			.min(1, 'Name ist erforderlich')
			.regex(/^[a-z0-9_]+$/, 'Name darf nur Kleinbuchstaben, Zahlen und Unterstriche enthalten'),
		display_name: z.string().min(1, 'Anzeigename ist erforderlich'),
		position: z.number().int().min(0, 'Position muss eine positive Zahl sein'),
		agent_role_instruction: z.string().optional()
	});

	// Name automatisch aus display_name generieren
	$: if (display_name && !name) {
		name = display_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
	}
	
	async function handleSubmit(event: Event) {
		event.preventDefault();
		try {
			const validation = createStatusSchema.safeParse({
				name,
				display_name,
				position,
				agent_role_instruction
			});
			
			if (!validation.success) {
				error = validation.error.errors[0].message;
				return;
			}
			
			error = '';
			isLoading = true;
			
			const response = await fetch(`/api/projects/${id}/statuses`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					display_name,
					position,
					agent_role_instruction: agent_role_instruction || null
				})
			});
			
			const result = await response.json();
			
			if (!result.ok) {
				error = result.error || 'Fehler beim Erstellen des Status';
				isLoading = false;
				return;
			}
			
			goto(`/projects/${id}/statuses?success=Status+erfolgreich+erstellt`);
		} catch (err) {
			error = 'Netzwerkfehler. Bitte versuchen Sie es erneut.';
			console.error('Create status error:', err);
		} finally {
			isLoading = false;
		}
	}
	
	function handleCancel() {
		goto(`/projects/${id}/statuses`);
	}
</script>

<div class="max-w-2xl">
	<!-- Header -->
	<div class="mb-6">
		<button 
			onclick={() => goto(`/projects/${id}/statuses`)}
			class="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-4"
		>
			<ArrowLeft class="w-4 h-4" />
			Zurück zu Statuses
		</button>
		
		<h1 class="text-2xl font-bold text-[var(--text)]">Neuer Status</h1>
		<p class="text-[var(--text-muted)] mt-1">Erstellen Sie einen neuen Board-Status</p>
	</div>
	
	<!-- Form -->
	<div class="card p-6">
		<form onsubmit={handleSubmit} class="space-y-4">
			<!-- Display Name -->
			<div>
				<label class="label" for="display_name">Anzeigename *</label>
				<input
					id="display_name"
					type="text"
					bind:value={display_name}
					class="input"
					placeholder="z.B. In Bearbeitung, Fertig, Blockiert"
					required
				/>
			</div>
			
			<!-- Name (Machine Name) -->
			<div>
				<label class="label" for="name">Name (Code) *</label>
				<div class="flex gap-2">
					<input
						id="name"
						type="text"
						bind:value={name}
						class="input flex-1 font-mono"
						placeholder="z.B. in_progress, done, blocked"
						required
					/>
				</div>
				<p class="text-xs text-[var(--text-muted)] mt-1">
					Nur Kleinbuchstaben, Zahlen und Unterstriche. Wird automatisch aus dem Anzeigenamen generiert.
				</p>
			</div>
			
			<!-- Position -->
			<div>
				<label class="label" for="position">Position</label>
				<input
					id="position"
					type="number"
					bind:value={position}
					class="input"
					placeholder="0"
					min="0"
				/>
				<p class="text-xs text-[var(--text-muted)] mt-1">
					Bestimmt die Reihenfolge der Spalten im Board.
				</p>
			</div>
			
			<!-- Agent Role Instruction -->
			<div>
				<label class="label" for="agent_role_instruction">Agent-Rollen-Instruktion</label>
				<textarea
					id="agent_role_instruction"
					bind:value={agent_role_instruction}
					class="input min-h-[100px] resize-vertical"
					placeholder="Beschreiben Sie, welche Rolle der Agent in diesem Status hat..."
				></textarea>
				<p class="text-xs text-[var(--text-muted)] mt-1">
					Optional. Wird für KI-Agenten verwendet.
				</p>
			</div>
			
			<!-- Error -->
			{#if error}
				<div class="p-3 bg-[var(--danger)/10] border border-[var(--danger)] rounded-md">
					<p class="text-sm text-[var(--danger)]">{error}</p>
				</div>
			{/if}
			
			<!-- Actions -->
			<div class="flex gap-3 pt-4">
				<button
					type="button"
					onclick={handleCancel}
					class="btn btn-ghost"
				>
					Abbrechen
				</button>
				<button
					type="submit"
					class="btn btn-primary flex-1"
					disabled={isLoading}
				>
					{#if isLoading}
						<span class="flex items-center justify-center gap-2">
							<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Status erstellen...
						</span>
					{:else}
						Status erstellen
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
