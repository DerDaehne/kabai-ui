<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { z } from 'zod';
	import { ArrowLeft, Plus, User, Flag } from 'lucide-svelte';
	import type { BoardStatus, Ticket, TicketType } from '$lib/types';

	let title = '';
	let description = '';
	let status_id: number | null = null;
	let assignee = '';
	let type: TicketType = 'ticket';
	let parentEpicId: number | null = null;
	let error = '';
	let isLoading = false;
	let statuses: BoardStatus[] = [];
	let epics: Ticket[] = [];

	$: id = $page.params.id;

	const createTicketSchema = z.object({
		title: z.string().min(1, 'Titel ist erforderlich'),
		description: z.string().nullable().optional(),
		status_id: z.number().int().min(1, 'Status ist erforderlich'),
		assignee: z.string().nullable().optional()
	});

	async function fetchStatuses() {
		try {
			const res = await fetch(`/api/projects/${id}/statuses`);
			const result = await res.json();
			if (result.ok) {
				// Human-Intervention/-Answered sind keine regulären Startspalten für neue Tickets
				statuses = result.data
					.filter((s: BoardStatus) => !s.special_type)
					.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
				// Pre-select status from URL param or first status
				const urlStatusId = $page.url.searchParams.get('status_id');
				if (urlStatusId) {
					status_id = parseInt(urlStatusId);
				} else if (statuses.length > 0 && !status_id) {
					status_id = statuses[0].id;
				}
			}
		} catch {}
	}

	async function fetchEpics() {
		try {
			const res = await fetch(`/api/projects/${id}/tickets`);
			const result = await res.json();
			if (result.ok) epics = result.data.filter((t: Ticket) => t.type === 'epic');
		} catch {}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		const validation = createTicketSchema.safeParse({
			title,
			description: description || null,
			status_id,
			assignee: assignee.trim() || null
		});
		if (!validation.success) {
			error = validation.error.errors[0].message;
			return;
		}
		error = '';
		isLoading = true;
		try {
			const res = await fetch(`/api/projects/${id}/tickets`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: validation.data.title,
					description: validation.data.description ?? null,
					status_id: validation.data.status_id,
					assignee: validation.data.assignee ?? null,
					type
				})
			});
			const result = await res.json();
			if (!result.ok) {
				error = result.error || 'Fehler beim Erstellen';
				return;
			}

			// Optional: Als Kind des gewählten Parent-Epics verknüpfen
			if (parentEpicId) {
				await fetch(`/api/tickets/${parentEpicId}/relations`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ to_ticket_id: result.data.id, relation_type: 'parent_of' })
				}).catch(() => {});
			}

			goto(`/projects/${id}?success=Ticket+erstellt`);
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => { fetchStatuses(); fetchEpics(); });
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

	<div in:fly={{ y: 20, duration: 400, easing: quintOut }}>
		<div class="flex items-center gap-3 mb-8">
			<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
				style="background: rgba(0,212,255,0.12); border: 1px solid rgba(0,212,255,0.3);">
				<Plus class="w-5 h-5" style="color: var(--primary);" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight" style="color: var(--text);">Neues Ticket</h1>
				<p class="text-sm" style="color: var(--text-muted);">Aufgabe erstellen und einem Status zuweisen</p>
			</div>
		</div>

		<div class="rounded-2xl p-6" style="background: var(--card-bg); border: 1px solid var(--border); box-shadow: 0 0 40px rgba(0,0,0,0.3);">
			<form onsubmit={handleSubmit} class="space-y-5">
				<!-- Title -->
				<div>
					<label class="block text-sm font-medium mb-2" style="color: var(--text);">
						Titel <span style="color: var(--danger);">*</span>
					</label>
					<input
						type="text"
						bind:value={title}
						class="input"
						placeholder="z.B. Login-Formular reparieren"
						autofocus
						required
					/>
				</div>

				<!-- Description -->
				<div>
					<label class="block text-sm font-medium mb-2" style="color: var(--text);">
						Beschreibung <span class="text-xs" style="color: var(--text-muted);">(optional)</span>
					</label>
					<textarea
						bind:value={description}
						class="input resize-none"
						rows="4"
						placeholder="Details zum Ticket…"
					></textarea>
				</div>

				<!-- Status -->
				<div>
					<label class="block text-sm font-medium mb-2" style="color: var(--text);">
						Status <span style="color: var(--danger);">*</span>
					</label>
					<select bind:value={status_id} class="input" required>
						{#if statuses.length === 0}
							<option value={null} disabled>Keine Statuses verfügbar</option>
						{:else}
							{#each statuses as s}
								<option value={s.id}>{s.display_name}</option>
							{/each}
						{/if}
					</select>
				</div>

				<!-- Assignee -->
				<div>
					<label class="block text-sm font-medium mb-2 flex items-center gap-2" style="color: var(--text);">
						<User class="w-4 h-4" style="color: var(--accent);" />
						Zugewiesen an
						<span class="text-xs" style="color: var(--text-muted);">(optional)</span>
					</label>
					<input
						type="text"
						bind:value={assignee}
						class="input"
						placeholder="Name des Verantwortlichen"
					/>
				</div>

				<!-- Type + Parent Epic -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium mb-2 flex items-center gap-2" style="color: var(--text);">
							<Flag class="w-4 h-4" style="color: #ffd000;" />
							Typ
						</label>
						<select bind:value={type} class="input">
							<option value="ticket">Ticket</option>
							<option value="epic">Epic</option>
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium mb-2" style="color: var(--text);">
							Parent-Epic <span class="text-xs" style="color: var(--text-muted);">(optional)</span>
						</label>
						<select bind:value={parentEpicId} class="input" disabled={epics.length === 0}>
							<option value={null}>{epics.length === 0 ? 'Keine Epics vorhanden' : 'Keiner'}</option>
							{#each epics as epic}<option value={epic.id}>#{epic.id} — {epic.title}</option>{/each}
						</select>
					</div>
				</div>

				{#if error}
					<div class="p-3 rounded-lg border text-sm" style="background: rgba(255,34,85,0.08); border-color: rgba(255,34,85,0.4); color: var(--danger);">
						{error}
					</div>
				{/if}

				<div class="flex gap-3 pt-2">
					<button type="button" onclick={() => goto(`/projects/${id}`)} class="btn btn-ghost">
						Abbrechen
					</button>
					<button
						type="submit"
						disabled={isLoading || statuses.length === 0 || !title}
						class="btn btn-primary flex items-center gap-2 flex-1 justify-center"
					>
						{#if isLoading}
							<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
							Erstellen…
						{:else}
							<Plus class="w-4 h-4" />
							Ticket erstellen
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
