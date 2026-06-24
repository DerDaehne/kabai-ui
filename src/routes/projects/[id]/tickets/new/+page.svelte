<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { z } from 'zod';
	import { ArrowLeft } from 'lucide-svelte';
	import type { BoardStatus } from '$lib/types';

	let title = '';
	let description = '';
	let status_id: number | null = null;
	let assignee = '';
	let error = '';
	let isLoading = false;

	let statuses: BoardStatus[] = [];
	let projectId: number | null = null;

	$: id = $page.params.id;
	
	// Statuses abrufen
	async function fetchStatuses() {
		try {
			const response = await fetch(`/api/projects/${id}/statuses`);
			const result = await response.json();
			
			if (result.ok) {
				statuses = result.data.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
				projectId = parseInt(id);
				// Standard-Status setzen (falls Statuses vorhanden)
				if (statuses.length > 0 && !status_id) {
					status_id = statuses[0].id;
				}
			}
		} catch (err) {
			console.error('Fetch statuses error:', err);
		}
	}
	
	// Validierung
	const createTicketSchema = z.object({
		title: z.string().min(1, 'Titel ist erforderlich'),
		description: z.string().optional(),
		status_id: z.number().int().min(1, 'Status ist erforderlich'),
		assignee: z.string().optional()
	});
	
	async function handleSubmit(event: Event) {
		event.preventDefault();
		try {
			const validation = createTicketSchema.safeParse({
				title,
				description,
				status_id,
				assignee: assignee || null
			});
			
			if (!validation.success) {
				error = validation.error.errors[0].message;
				return;
			}
			
			error = '';
			isLoading = true;
			
			const response = await fetch(`/api/projects/${id}/tickets`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					description: description || null,
					status_id: validation.data.status_id,
					assignee: validation.data.assignee
				})
			});
			
			const result = await response.json();
			
			if (!result.ok) {
				error = result.error || 'Fehler beim Erstellen des Tickets';
				isLoading = false;
				return;
			}
			
			goto(`/projects/${id}?success=Ticket+erfolgreich+erstellt`);
		} catch (err) {
			error = 'Netzwerkfehler. Bitte versuchen Sie es erneut.';
			console.error('Create ticket error:', err);
		} finally {
			isLoading = false;
		}
	}
	
	function handleCancel() {
		goto(`/projects/${id}`);
	}
	
	onMount(() => {
		fetchStatuses();
	});
</script>

<div class="max-w-2xl">
	<!-- Header -->
	<div class="mb-6">
		<button 
			onclick={() => goto(`/projects/${id}`)}
			class="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-4"
		>
			<ArrowLeft class="w-4 h-4" />
			Zurück zum Board
		</button>
		
		<h1 class="text-2xl font-bold text-[var(--text)]">Neues Ticket</h1>
		<p class="text-[var(--text-muted)] mt-1">Erstellen Sie ein neues Ticket</p>
	</div>
	
	<!-- Form -->
	<div class="card p-6">
		<form onsubmit={handleSubmit} class="space-y-4">
			<!-- Title -->
			<div>
				<label class="label" for="title">Titel *</label>
				<input
					id="title"
					type="text"
					bind:value={title}
					class="input"
					placeholder="z.B. Login-Formular reparieren, API-Dokumentation aktualisieren"
					required
				/>
			</div>
			
			<!-- Description -->
			<div>
				<label class="label" for="description">Beschreibung</label>
				<textarea
					id="description"
					bind:value={description}
					class="input min-h-[100px] resize-vertical"
					placeholder="Beschreiben Sie das Ticket..."
				></textarea>
			</div>
			
			<!-- Status -->
			<div>
				<label class="label" for="status_id">Status *</label>
				<select
					id="status_id"
					bind:value={status_id}
					class="input"
					required
				>
					{#if statuses.length === 0}
						<option value="" disabled>Keine Statuses verfügbar</option>
					{:else}
						{#each statuses as status}
							<option value={status.id}>
								{status.display_name} ({status.name})
							</option>
						{/each}
					{/if}
				</select>
				<p class="text-xs text-[var(--text-muted)] mt-1">
					Wählen Sie den Anfangs-Status für das Ticket.
				</p>
			</div>
			
			<!-- Assignee -->
			<div>
				<label class="label" for="assignee">Zugewiesen an</label>
				<input
					id="assignee"
					type="text"
					bind:value={assignee}
					class="input"
					placeholder="Name des Verantwortlichen"
				/>
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
					disabled={isLoading || statuses.length === 0}
				>
					{#if isLoading}
						<span class="flex items-center justify-center gap-2">
							<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Ticket erstellen...
						</span>
					{:else}
						Ticket erstellen
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
