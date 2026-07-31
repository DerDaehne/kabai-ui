<script lang="ts">
	// Ticket #506: Formular aus src/routes/projects/[id]/tickets/new/+page.svelte
	// extrahiert, Markup/Logik weitgehend unverändert übernommen — läuft jetzt im
	// BottomSheet statt auf einer eigenen Route. onCreated wird nach erfolgreichem
	// Anlegen aufgerufen (Aufrufer entscheidet über Navigation/Refresh + Exit-Animation).
	import { onMount } from 'svelte';
	import { z } from 'zod';
	import { Plus, User, Flag } from 'lucide-svelte';
	import type { BoardStatus, Ticket, TicketType, AttachmentUploadResult } from '$lib/types';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';
	import AttachmentGallery from '$components/tickets/AttachmentGallery.svelte';
	import { extractPastedImage } from '$lib/utils/attachments';

	export let projectId: string;
	export let initialStatusId: number | null = null;
	export let onCreated: (ticket: { id: number }) => void = () => {};
	export let onCancel: () => void = () => {};

	let title = '';
	let description = '';
	let status_id: number | null = initialStatusId;
	let assignee = '';
	let type: TicketType = 'ticket';
	let parentEpicId: number | null = null;
	let error = '';
	let isLoading = false;
	let statuses: BoardStatus[] = [];
	let epics: Ticket[] = [];

	// Bild-Anhänge (#692): das Ticket existiert beim Ausfüllen noch nicht, also
	// werden Bilder sofort nach /api/attachments hochgeladen ("staged") und erst
	// nach erfolgreichem Anlegen mit der neuen Ticket-ID verknüpft. Löschen vor
	// dem Anlegen entfernt nur aus diesem lokalen State — der Blob bleibt ein
	// unverknüpftes Waisenkind (akzeptiert laut ADR-004, kein neues Problem).
	let stagedAttachments: { id: number; filename: string }[] = [];
	let isUploadingAttachment = false;

	async function uploadStagedAttachment(file: File) {
		isUploadingAttachment = true; error = '';
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/attachments', { method: 'POST', body: formData });
			const result = await res.json();
			if (!result.ok) { error = result.error || 'Fehler beim Hochladen des Bildes'; return; }
			const uploaded: AttachmentUploadResult = result.data;
			stagedAttachments = [...stagedAttachments, { id: uploaded.id, filename: uploaded.filename }];
		} catch { error = 'Netzwerkfehler'; }
		finally { isUploadingAttachment = false; }
	}

	function removeStagedAttachment(id: number) {
		stagedAttachments = stagedAttachments.filter((a) => a.id !== id);
	}

	async function handleWindowPaste(e: ClipboardEvent) {
		const file = extractPastedImage(e);
		if (file) {
			e.preventDefault();
			await uploadStagedAttachment(file);
		}
	}

	const createTicketSchema = z.object({
		title: z.string().min(1, 'Titel ist erforderlich'),
		description: z.string().nullable().optional(),
		status_id: z.number().int().min(1, 'Status ist erforderlich'),
		assignee: z.string().nullable().optional()
	});

	async function fetchStatuses() {
		try {
			const res = await fetch(`/api/projects/${projectId}/statuses`);
			const result = await res.json();
			if (result.ok) {
				// Human-Intervention/-Answered sind keine regulären Startspalten für neue Tickets
				statuses = result.data
					.filter((s: BoardStatus) => !s.special_type)
					.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
				if (!status_id && statuses.length > 0) {
					status_id = statuses[0].id;
				}
			}
		} catch {}
	}

	async function fetchEpics() {
		try {
			const res = await fetch(`/api/projects/${projectId}/tickets`);
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
			const res = await fetch(`/api/projects/${projectId}/tickets`, {
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

			// Gestagte Anhänge (#692) jetzt mit der neuen Ticket-ID verknüpfen
			for (const att of stagedAttachments) {
				await fetch(`/api/tickets/${result.data.id}/attachments`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ attachment_id: att.id })
				}).catch(() => {});
			}

			onCreated(result.data);
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => { fetchStatuses(); fetchEpics(); });
</script>

<svelte:window on:paste={handleWindowPaste} />

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
			class="input resize-y"
			rows="8"
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
				<Flag class="w-4 h-4" style="color: #f59e0b;" />
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

	<!-- Bild-Anhänge (#692): Dateiauswahl, oder Strg+V zum Einfügen aus der Zwischenablage -->
	<AttachmentGallery
		attachments={stagedAttachments}
		isUploading={isUploadingAttachment}
		onUpload={uploadStagedAttachment}
		onDelete={removeStagedAttachment}
	/>

	{#if error}
		<ErrorBanner message={error} compact />
	{/if}

	<div class="flex gap-3 pt-2">
		<button type="button" onclick={onCancel} class="btn btn-ghost">
			Abbrechen
		</button>
		<button
			type="submit"
			disabled={isLoading || statuses.length === 0 || !title}
			class="btn btn-primary flex items-center gap-2 flex-1 justify-center"
		>
			{#if isLoading}
				<Spinner size={4} color="black" thickness="border-2" />
				Erstellen…
			{:else}
				<Plus class="w-4 h-4" />
				Ticket erstellen
			{/if}
		</button>
	</div>
</form>
