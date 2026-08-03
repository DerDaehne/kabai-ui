<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { renderMarkdown } from '$lib/markdown';
	import { fly, slide } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	import { MessageSquare, User, Clock, Trash2, Pencil, X, Check, Bot, Cpu, Send, Flag, Plus, BookOpen, Compass, AlertTriangle, Archive, MoreHorizontal, Gauge, Layers } from 'lucide-svelte';
	import OrbitHighlight from '$components/ui/OrbitHighlight.svelte';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';
	import BannerConfirm from '$components/ui/BannerConfirm.svelte';
	import AttachmentGallery from '$components/tickets/AttachmentGallery.svelte';
	import { pushAiEvent } from '$lib/stores/aiActivity';
	import { extractPastedImage } from '$lib/utils/attachments';
	import type { TicketDetailed, BoardStatus, TicketTask, Ticket, RelationType, AttachmentUploadResult } from '$lib/types';
	import { formatDate, initials } from '$lib/utils/format';

	export let ticketId: number;
	export let onClose: () => void = () => {};
	export let onDeleted: () => void = () => {};
	export let liveUpdateSignal: { ticketId: number; seq: number } | null = null;
	// Ticket #509: Host-agnostisch — im SidePanel (Board) liefert der Host bereits
	// eine zentrale SSE-Verbindung + liveUpdateSignal-Prop. Als Vollseiten-Deep-Link
	// (src/routes/tickets/[id]/+page.svelte) gibt es keinen solchen Host, daher baut
	// das Modal in diesem Fall seine eigene SSE-Verbindung auf (Muster wie vormals
	// in der Route selbst: connectLiveUpdates + pushAiEvent für die Activity-Rail).
	export let standalone = false;
	// Nur relevant für standalone: informiert den Wrapper über die project_id,
	// sobald das Ticket geladen ist, damit "Zurück zum Board" zum richtigen
	// Projekt zurückspringen kann (vormals via $page.params in der Route selbst).
	export let onProjectLoaded: (projectId: number) => void = () => {};

	let ticket: TicketDetailed | null = null;
	let statuses: BoardStatus[] = [];
	let isLoading = true;
	let error = '';
	let isEditing = false;
	let isSaving = false;
	let isDeleting = false;
	let isReturning = false;

	let editTitle = '';
	let editDescription = '';
	let editAssignee = '';
	let editModel = '';
	// number-Inputs binden auf number|null, nicht string — bind:value auf
	// type="number" mit einem String-Wert verursacht Reaktivitäts-Instabilität
	// (Svelte 5 sieht die DOM-Repräsentation und den String-Wert als ständig
	// "verschieden" an und rendert das Element endlos neu, siehe editValues in
	// StatusesModal.svelte/position in NewStatusSheet.svelte für das etablierte
	// Pattern: number-Inputs binden immer auf number-typisierte Variablen).
	let editEffortEstimate: number | null = null;
	let editEffortActual: number | null = null;
	let editEffortUnit = '';
	let editStatusId: number | null = null;
	let editType: 'ticket' | 'epic' = 'ticket';

	// Relations
	let showAddRelation = false;
	let projectTickets: Ticket[] = [];
	let relationTargetId: number | null = null;
	let relationType: RelationType = 'relates_to';
	let isAddingRelation = false;
	let deletingRelationId: number | null = null;

	// Comments
	let newCommentText = '';
	let isAddingComment = false;

	// Tasks
	let newTaskTitle = '';
	let isAddingTask = false;
	let deletingTaskId: number | null = null;

	// Attachments (Codeberg kbai-ui#4, #469; Zwischenablage #692)
	let isUploadingAttachment = false;
	let deletingAttachmentId: number | null = null;
	let isDragOverDescription = false;

	// Label aus Sicht des aktuell offenen Tickets: "outgoing" = dieses Ticket ist from_ticket
	const relationLabels: Record<RelationType, string> = {
		parent_of: 'ist Parent von',
		blocks: 'blockiert',
		duplicate_of: 'ist Duplikat von',
		relates_to: 'bezieht sich auf'
	};
	const noteRelationLabels: Record<string, string> = {
		documents: 'dokumentiert',
		created_by: 'erstellt durch',
		verified_by: 'verifiziert durch',
		references: 'referenziert'
	};

	const incomingRelationLabels: Record<RelationType, string> = {
		parent_of: 'ist Kind von',
		blocks: 'wird blockiert von',
		duplicate_of: 'ist Original von',
		relates_to: 'bezieht sich auf'
	};

	async function fetchTicket() {
		try {
			isLoading = true;
			const res = await fetch(`/api/tickets/${ticketId}`);
			const result = await res.json();
			if (result.ok) {
				const loaded: TicketDetailed = { ...result.data.ticket, status: result.data.status, tasks: result.data.tasks, comments: result.data.comments, relations: result.data.relations, linked_notes: result.data.linked_notes ?? [], attachments: result.data.attachments ?? [], referenced_by_canvases: result.data.referenced_by_canvases ?? [] };
				ticket = loaded;
				if (loaded.status?.special_type === 'human_intervention') await fetchStatuses();
				connectStandaloneLiveUpdates(loaded.project_id);
				if (standalone) onProjectLoaded(loaded.project_id);
			} else {
				error = result.error || 'Ticket nicht gefunden';
			}
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	// Treibt die einmalige Orbit-Highlight-Animation (siehe OrbitHighlight.svelte)
	// auf dem Panel-Container, wenn ein Live-Refresh eintrifft.
	let orbitSignal = 0;

	// Live-Refresh, während das Modal offen ist (z.B. ein KI-Agent kommentiert,
	// während der Mensch das Ticket gerade angeschaut hat). Kein Loading-Spinner,
	// damit der bereits sichtbare Inhalt nicht wegflackert; während der Nutzer
	// selbst editiert, wird nicht überschrieben, um unsaved changes zu schützen.
	async function refreshTicketQuietly() {
		if (isEditing) return;
		try {
			const res = await fetch(`/api/tickets/${ticketId}`);
			const result = await res.json();
			if (result.ok) {
				ticket = { ...result.data.ticket, status: result.data.status, tasks: result.data.tasks, comments: result.data.comments, relations: result.data.relations, linked_notes: result.data.linked_notes ?? [], attachments: result.data.attachments ?? [], referenced_by_canvases: result.data.referenced_by_canvases ?? [] };
				orbitSignal += 1;
			}
		} catch { /* still showing the previous state is fine */ }
	}

	let lastSeenSeq = -1;
	$: if (liveUpdateSignal && liveUpdateSignal.ticketId === ticketId && liveUpdateSignal.seq !== lastSeenSeq) {
		lastSeenSeq = liveUpdateSignal.seq;
		refreshTicketQuietly();
	}

	// Nur im standalone-Modus (Vollseiten-Deep-Link) aktiv — im SidePanel übernimmt
	// der Host (projects/[id]/+page.svelte) die SSE-Verbindung zentral für alle Tickets.
	let eventSource: EventSource | null = null;
	function connectStandaloneLiveUpdates(projectId: number) {
		if (!standalone || eventSource) return;
		eventSource = new EventSource(`/api/projects/${projectId}/events`);
		eventSource.onmessage = (event) => {
			try {
				const payload = JSON.parse(event.data) as { op: string; ticket_id: number };
				pushAiEvent(payload.ticket_id, payload.op);
				if (payload.ticket_id !== ticketId) return;
				refreshTicketQuietly();
			} catch { /* ignore */ }
		};
	}

	onDestroy(() => eventSource?.close());

	async function fetchStatuses() {
		if (!ticket) return;
		try {
			const res = await fetch(`/api/projects/${ticket.project_id}/statuses`);
			const result = await res.json();
			if (result.ok) statuses = result.data.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
		} catch {}
	}

	function startEdit() {
		if (!ticket) return;
		editTitle = ticket.title;
		editDescription = ticket.description || '';
		editAssignee = ticket.assignee || '';
		editModel = ticket.model || '';
		editEffortEstimate = ticket.effort_estimate;
		editEffortActual = ticket.effort_actual;
		editEffortUnit = ticket.effort_unit || '';
		editStatusId = ticket.status_id;
		editType = ticket.type;
		if (statuses.length === 0) fetchStatuses();
		isEditing = true;
	}

	function cancelEdit() { isEditing = false; error = ''; }

	async function saveEdit() {
		if (!ticket || !editTitle.trim()) return;
		isSaving = true; error = '';
		try {
			const res = await fetch(`/api/tickets/${ticketId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: editTitle.trim(),
					description: editDescription.trim() || null,
					assignee: editAssignee.trim() || null,
					model: editModel.trim() || null,
					status_id: editStatusId ?? ticket.status_id,
					type: editType,
					effort_estimate: editEffortEstimate,
					effort_actual: editEffortActual,
					effort_unit: editEffortUnit.trim() || null
				})
			});
			const result = await res.json();
			if (result.ok) { await fetchTicket(); isEditing = false; }
			else error = result.error || 'Fehler beim Speichern';
		} catch { error = 'Netzwerkfehler'; }
		finally { isSaving = false; }
	}

	async function returnToAI() {
		if (!ticket || !humanAnsweredStatus) return;
		isReturning = true; error = '';
		try {
			const res = await fetch(`/api/tickets/${ticketId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status_id: humanAnsweredStatus.id })
			});
			const result = await res.json();
			if (result.ok) await fetchTicket();
			else error = result.error || 'Fehler beim Zurückgeben';
		} catch { error = 'Netzwerkfehler'; }
		finally { isReturning = false; }
	}

	// Overflow-Menü ("Weitere Aktionen") im Kopfbereich
	let showActionsMenu = false;
	let actionsMenuEl: HTMLDivElement | null = null;

	function toggleActionsMenu() {
		showActionsMenu = !showActionsMenu;
	}

	function handleMenuWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showActionsMenu) {
			// Escape schließt nur das Menü, nicht das Panel dahinter
			e.stopPropagation();
			showActionsMenu = false;
		}
	}

	function handleMenuOutsideClick(e: MouseEvent) {
		if (showActionsMenu && actionsMenuEl && !actionsMenuEl.contains(e.target as Node)) {
			showActionsMenu = false;
		}
	}

	// Ticket #508: window.confirm ersetzt durch das Band-Popup (BannerConfirm).
	let pendingDeleteTicket = false;

	function handleDelete() {
		if (!ticket) return;
		pendingDeleteTicket = true;
	}

	function cancelDeleteTicket() {
		pendingDeleteTicket = false;
	}

	async function confirmDeleteTicket() {
		if (!ticket || isDeleting) return;
		pendingDeleteTicket = false;
		isDeleting = true;
		try {
			const res = await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) { onDeleted(); onClose(); }
			else error = result.error || 'Fehler beim Löschen';
		} catch { error = 'Netzwerkfehler'; }
		finally { isDeleting = false; }
	}

	async function openAddRelation() {
		showAddRelation = true;
		relationTargetId = null;
		relationType = 'relates_to';
		if (ticket && projectTickets.length === 0) {
			try {
				const res = await fetch(`/api/projects/${ticket.project_id}/tickets`);
				const result = await res.json();
				if (result.ok) projectTickets = result.data.filter((t: Ticket) => t.id !== ticket!.id);
			} catch {}
		}
	}

	async function addRelation() {
		if (!ticket || !relationTargetId) return;
		isAddingRelation = true; error = '';
		try {
			const res = await fetch(`/api/tickets/${ticketId}/relations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ to_ticket_id: relationTargetId, relation_type: relationType })
			});
			const result = await res.json();
			if (result.ok) { await fetchTicket(); showAddRelation = false; }
			else error = result.error || 'Fehler beim Verknüpfen';
		} catch { error = 'Netzwerkfehler'; }
		finally { isAddingRelation = false; }
	}

	async function removeRelation(relationId: number) {
		deletingRelationId = relationId;
		try {
			const res = await fetch(`/api/tickets/${ticketId}/relations/${relationId}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) await fetchTicket();
		} catch {}
		finally { deletingRelationId = null; }
	}

	async function addComment() {
		if (!newCommentText.trim()) return;
		isAddingComment = true;
		const author = $page.data.session?.username || 'Unbekannt';
		try {
			const res = await fetch(`/api/tickets/${ticketId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ author, comment_text: newCommentText.trim() })
			});
			const result = await res.json();
			if (result.ok) { newCommentText = ''; await fetchTicket(); }
			else error = result.error || 'Fehler beim Kommentieren';
		} catch { error = 'Netzwerkfehler'; }
		finally { isAddingComment = false; }
	}

	async function toggleTask(task: TicketTask) {
		try {
			const res = await fetch(`/api/tickets/${ticketId}/tasks/${task.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_completed: !task.is_completed })
			});
			const result = await res.json();
			if (result.ok && ticket) {
				ticket.tasks = ticket.tasks.map(t => t.id === task.id ? result.data : t);
				ticket = ticket;
			}
		} catch {}
	}

	async function addTask() {
		if (!newTaskTitle.trim() || !ticket) return;
		isAddingTask = true;
		try {
			const res = await fetch(`/api/tickets/${ticketId}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: newTaskTitle.trim() })
			});
			const result = await res.json();
			if (result.ok) {
				ticket.tasks = [...ticket.tasks, result.data];
				newTaskTitle = '';
			} else error = result.error || 'Fehler beim Anlegen der Task';
		} catch { error = 'Netzwerkfehler'; }
		finally { isAddingTask = false; }
	}

	async function deleteTask(taskId: number) {
		deletingTaskId = taskId;
		try {
			const res = await fetch(`/api/tickets/${ticketId}/tasks/${taskId}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok && ticket) {
				ticket.tasks = ticket.tasks.filter(t => t.id !== taskId);
			}
		} catch {}
		finally { deletingTaskId = null; }
	}

	// Zweistufig wie beim Canvas-Bild-Upload (#529): erst Datei nach
	// /api/attachments hochladen, dann per attachment_id an dieses Ticket hängen.
	async function uploadAttachmentFile(file: File) {
		if (!ticket) return;
		isUploadingAttachment = true; error = '';
		try {
			const formData = new FormData();
			formData.append('file', file);
			const uploadRes = await fetch('/api/attachments', { method: 'POST', body: formData });
			const uploadResult = await uploadRes.json();
			if (!uploadResult.ok) { error = uploadResult.error || 'Fehler beim Hochladen des Bildes'; return; }
			const uploaded: AttachmentUploadResult = uploadResult.data;

			const linkRes = await fetch(`/api/tickets/${ticketId}/attachments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ attachment_id: uploaded.id })
			});
			const linkResult = await linkRes.json();
			if (linkResult.ok && ticket) {
				ticket.attachments = [...ticket.attachments, linkResult.data];
			} else {
				error = linkResult.error || 'Fehler beim Verknüpfen des Anhangs';
			}
		} catch { error = 'Netzwerkfehler'; }
		finally { isUploadingAttachment = false; }
	}

	// Zwischenablage-Einfügen (#692) — nur im Bearbeiten-Modus aktiv, da nur
	// dann ein sinnvoller Ziel-Kontext existiert; normales Text-Paste in ein
	// Feld bleibt unangetastet, wenn kein Bild im Clip liegt.
	async function handleWindowPaste(e: ClipboardEvent) {
		if (!isEditing) return;
		const file = extractPastedImage(e);
		if (file) {
			e.preventDefault();
			await uploadAttachmentFile(file);
		}
	}

	// Drag-and-drop aufs Beschreibungsfeld (Ticket #469 explizit im Scope) —
	// nur während des Bearbeitens relevant, da nur dann ein Textarea existiert.
	function handleDescriptionDragOver(e: DragEvent) {
		if (!e.dataTransfer?.types.includes('Files')) return;
		e.preventDefault();
		isDragOverDescription = true;
	}
	function handleDescriptionDragLeave() {
		isDragOverDescription = false;
	}
	async function handleDescriptionDrop(e: DragEvent) {
		e.preventDefault();
		isDragOverDescription = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) await uploadAttachmentFile(file);
	}

	async function deleteAttachment(attachmentId: number) {
		deletingAttachmentId = attachmentId;
		try {
			const res = await fetch(`/api/tickets/${ticketId}/attachments/${attachmentId}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok && ticket) {
				// AttachmentGallery leitet ihre Lightbox aus den attachments ab —
				// verschwindet die Zeile hier, schließt sich die Lightbox von selbst.
				ticket.attachments = ticket.attachments.filter(a => a.id !== attachmentId);
			}
		} catch {}
		finally { deletingAttachmentId = null; }
	}

	$: humanAnsweredStatus = statuses.find(s => s.special_type === 'human_answered') ?? null;
	// Manuelles Umschalten IN Human-Intervention/-Answered ist nicht vorgesehen —
	// das läuft ausschließlich über die Inbox bzw. den "An die KI zurückgeben"-Button.
	// Der aktuelle Status bleibt in der Liste, damit das Dropdown ihn korrekt anzeigt.
	$: editableStatuses = statuses.filter(s => !s.special_type || s.id === ticket?.status_id);
	$: isAwaitingHuman = ticket?.status?.special_type === 'human_intervention';

	$: tasksCompleted = ticket?.tasks.filter(t => t.is_completed).length ?? 0;
	$: tasksTotal = ticket?.tasks.length ?? 0;
	$: taskProgress = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

	onMount(fetchTicket);
</script>

<svelte:window on:keydown|capture={handleMenuWindowKeydown} on:click={handleMenuOutsideClick} on:paste={handleWindowPaste} />

<div class={standalone ? '' : 'p-6 pr-14'}>
	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-20 gap-4">
			<Spinner />
		</div>
	{:else if error && !ticket}
		<ErrorBanner message={error} />
	{:else if ticket}
		<div class="relative space-y-4 rounded-2xl"
			in:fly={{ y: 12, duration: 300, easing: quintOut }}>
			<!-- Live-Update wird über eine einmalige Orbit-Animation entlang der Panel-Kontur
			     visualisiert (kein einschiebender Hinweistext, der das Layout verschiebt, #309). -->
			<OrbitHighlight signal={orbitSignal || null} radius="1rem" />
			<!-- Title + badges + actions -->
			<div class="flex items-start justify-between gap-4">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 flex-wrap mb-2">
						<span class="text-xs font-mono" style="color: var(--text-muted);">#{ticket.id}</span>
						{#if ticket.status}
							<span class="status-chip" style="--chip-color: var(--color-primary);">{ticket.status.display_name}</span>
						{/if}
						{#if ticket.type === 'epic'}
							<span class="flex items-center gap-1 text-xs font-medium" style="color: var(--color-warning);">
								<Flag class="w-3 h-3" /> Epic
							</span>
						{/if}
						{#if ticket.docs_required}
							<span class="flex items-center gap-1 text-xs font-medium"
								title="Dieses Ticket erfordert eine verlinkte Knowledge-Base-Note, bevor es geschlossen werden kann"
								style="color: var(--text-muted);">
								<BookOpen class="w-3 h-3" /> Doku-Pflicht
							</span>
						{/if}
					</div>
					<h2 class="text-xl font-bold leading-tight" style="color: var(--text);">{ticket.title}</h2>
				</div>
				<div class="flex items-center gap-2 shrink-0">
					{#if !isEditing}
						<button onclick={startEdit}
							class="btn-subtle flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
							<Pencil class="w-3.5 h-3.5" /> Bearbeiten
						</button>
					{/if}
					<div class="relative" bind:this={actionsMenuEl}>
						<button onclick={toggleActionsMenu}
							aria-label="Weitere Aktionen" aria-haspopup="menu" aria-expanded={showActionsMenu}
							class="btn btn-ghost flex items-center justify-center !p-1.5 rounded-lg">
							<MoreHorizontal class="w-4 h-4" />
						</button>
						{#if showActionsMenu}
							<div role="menu" aria-label="Weitere Aktionen"
								class="absolute right-0 top-full mt-1 z-20 min-w-[140px] py-1"
								style="background: var(--color-surface); box-shadow: var(--elevation-2); border: 1px solid var(--edge-strong); border-radius: var(--radius-control);">
								<button role="menuitem" onclick={() => { showActionsMenu = false; handleDelete(); }} disabled={isDeleting}
									class="actions-menu-item w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors"
									style="color: var(--danger);">
									{#if isDeleting}
										<Spinner size={3} color="currentColor" thickness="border" />
									{:else}
										<Trash2 class="w-3.5 h-3.5" />
									{/if}
									Löschen
								</button>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Human Intervention Banner -->
			{#if isAwaitingHuman}
				<div class="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
					style="border-left: 2px solid var(--primary); background: color-mix(in srgb, var(--color-primary) 6%, transparent);"
					in:fly={{ y: -8, duration: 250 }}>
					<p class="text-sm" style="color: var(--text);">
						Dieses Ticket wartet auf deine Antwort. Beantworte die Frage der KI (z.B. per Kommentar) und gib es dann zurück.
					</p>
					<button onclick={returnToAI} disabled={isReturning || !humanAnsweredStatus}
						class="btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold shrink-0">
						{#if isReturning}
							<Spinner size={3} color="currentColor" thickness="border-2" />
						{:else}
							<Send class="w-3.5 h-3.5" />
						{/if}
						An die KI zurückgeben
					</button>
				</div>
			{/if}

			<!-- Inline edit -->
			{#if isEditing}
				<div transition:slide={{ duration: 280, easing: cubicOut }}
					class="rounded-xl p-4 space-y-3"
					style="background: color-mix(in srgb, var(--color-primary) 3%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);">
					<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--primary);">Bearbeiten</p>
					<div>
						<label class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">Titel *</label>
						<input type="text" bind:value={editTitle} class="input" autofocus />
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">Status</label>
							<select bind:value={editStatusId} class="input">
								{#each editableStatuses as s}<option value={s.id}>{s.display_name}</option>{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-medium mb-1.5 flex items-center gap-1" style="color: var(--text-muted);">
								<User class="w-3 h-3" /> Assignee
							</label>
							<input type="text" bind:value={editAssignee} class="input" placeholder="Optional" />
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style="color: var(--text-muted);">
								<Cpu class="w-3 h-3" /> KI-Modell <span class="opacity-50">(optional)</span>
							</label>
							<input type="text" bind:value={editModel} class="input font-mono" placeholder="z.B. claude-sonnet-4-6" />
						</div>
						<div>
							<label class="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style="color: var(--text-muted);">
								<Flag class="w-3 h-3" /> Typ
							</label>
							<select bind:value={editType} class="input">
								<option value="ticket">Ticket</option>
								<option value="epic">Epic</option>
							</select>
						</div>
					</div>
					<div class="grid grid-cols-3 gap-3">
						<div>
							<label for="effort-estimate" class="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style="color: var(--text-muted);">
								<Gauge class="w-3 h-3" /> Aufwand (Schätzung)
							</label>
							<input id="effort-estimate" type="number" step="any" bind:value={editEffortEstimate} class="input" placeholder="Optional" />
						</div>
						<div>
							<label for="effort-actual" class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">Aufwand (tatsächlich)</label>
							<input id="effort-actual" type="number" step="any" bind:value={editEffortActual} class="input" placeholder="Optional" />
						</div>
						<div>
							<label for="effort-unit" class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">Einheit</label>
							<input id="effort-unit" type="text" bind:value={editEffortUnit} class="input" placeholder="z.B. Tage, Punkte, Tokens" />
						</div>
					</div>
					<div>
						<label class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">Beschreibung <span class="opacity-50">(Bild hierher ziehen zum Anhängen)</span></label>
						<textarea bind:value={editDescription} class="input resize-y" rows="6" placeholder="Details…"
							style={isDragOverDescription ? 'outline: 2px dashed var(--primary); outline-offset: -2px;' : ''}
							ondragover={handleDescriptionDragOver} ondragleave={handleDescriptionDragLeave} ondrop={handleDescriptionDrop}></textarea>
					</div>
					{#if error}
						<div class="p-2 rounded text-xs" style="background: rgba(239,68,68,0.1); color: var(--danger);">{error}</div>
					{/if}
					<div class="flex justify-end gap-2">
						<button onclick={cancelEdit} class="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs"><X class="w-3.5 h-3.5" /> Abbrechen</button>
						<button onclick={saveEdit} disabled={isSaving || !editTitle.trim()}
							class="btn-subtle flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold"
							style="color: var(--primary);">
							{#if isSaving}<Spinner size={3} color="currentColor" thickness="border-2" />{:else}<Check class="w-3.5 h-3.5" />{/if}
							Speichern
						</button>
					</div>
				</div>
			{/if}

			<!-- Meta -->
			<div class="hairline"></div>
			<div class="flex flex-wrap items-center gap-5 py-3 text-sm">
				<div class="flex items-center gap-1.5" style="color: {ticket.assignee ? 'var(--text)' : 'var(--text-muted)'};">
					<User class="w-3.5 h-3.5 shrink-0" style="color: var(--text-muted);" />
					{ticket.assignee || 'Nicht zugewiesen'}
				</div>
				{#if ticket.model}
					<div class="flex items-center gap-1.5">
						<Cpu class="w-3.5 h-3.5 shrink-0" style="color: var(--accent);" />
						<span class="font-mono text-xs px-1.5 py-0.5 rounded" style="background: var(--color-surface-hover); color: var(--color-text-secondary);">{ticket.model}</span>
					</div>
				{/if}
				{#if ticket.effort_estimate !== null || ticket.effort_actual !== null}
					<div class="flex items-center gap-1.5 font-mono text-xs" style="color: var(--text-muted);" title="Aufwand: Schätzung/tatsächlich">
						<Gauge class="w-3.5 h-3.5 shrink-0" />
						{ticket.effort_actual ?? '?'}/{ticket.effort_estimate ?? '?'}{ticket.effort_unit ? ` ${ticket.effort_unit}` : ''}
					</div>
				{/if}
				<div class="flex items-center gap-1.5 font-mono text-xs" style="color: var(--text-muted);">
					<Clock class="w-3.5 h-3.5 shrink-0" />
					{formatDate(ticket.created_at)}
				</div>
				{#if standalone}
					<div class="flex items-center gap-1.5 font-mono text-xs" style="color: var(--text-muted);">
						<Clock class="w-3.5 h-3.5 shrink-0" />
						Zuletzt: {formatDate(ticket.updated_at)}
					</div>
				{/if}
			</div>
			<div class="hairline"></div>

			<!-- Description -->
			{#if ticket.description}
				<div class="markdown-body text-sm leading-relaxed" style="color: var(--text);">{@html renderMarkdown(ticket.description)}</div>
			{/if}

			<!-- Attachments (Codeberg kbai-ui#4, #469; Zwischenablage #692) -->
			<AttachmentGallery
				attachments={ticket.attachments}
				isUploading={isUploadingAttachment}
				deletingId={deletingAttachmentId}
				onUpload={uploadAttachmentFile}
				onDelete={deleteAttachment}
			/>

			<!-- Tasks -->
			<section>
				<div class="pb-2 flex items-center justify-between">
					<h3 class="section-heading">Tasks</h3>
					{#if tasksTotal > 0}
						<span class="text-xs font-mono" style="color: var(--text-muted);">{tasksCompleted}/{tasksTotal}</span>
					{/if}
				</div>
				<div class="hairline"></div>
				{#if tasksTotal > 0}
					<div class="pt-3 pb-1">
						<div class="h-1 rounded-full mb-3" style="background: rgba(255,255,255,0.06);">
							<div class="h-full rounded-full transition-all duration-500" style="width: {taskProgress}%; background: {taskProgress === 100 ? 'var(--success)' : 'var(--primary)'}; "></div>
						</div>
					</div>
					<div class="pb-2 space-y-0.5">
						{#each ticket.tasks as task (task.id)}
							<div class="group flex items-center gap-3 py-1.5 px-2 rounded-lg transition-all hover:bg-[var(--color-surface-hover)]">
								<label class="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
									<input type="checkbox" checked={task.is_completed} onchange={() => toggleTask(task)}
										class="w-4 h-4 rounded shrink-0" style="accent-color: var(--primary);" />
									<span class="text-sm {task.is_completed ? 'line-through' : ''}"
										style="color: {task.is_completed ? 'var(--text-muted)' : 'var(--text)'};">{task.title}</span>
								</label>
								<button onclick={() => deleteTask(task.id)} disabled={deletingTaskId === task.id}
									class="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
									style="color: var(--danger);" title="Task löschen">
									<X class="w-3 h-3" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
				<div class="pt-2 flex gap-2">
					<input type="text" bind:value={newTaskTitle} placeholder="Neue Task…"
						class="input text-sm flex-1"
						onkeydown={(e) => e.key === 'Enter' && addTask()} />
					<button onclick={addTask} disabled={!newTaskTitle.trim() || isAddingTask}
						class="btn-subtle flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium shrink-0">
						{#if isAddingTask}<Spinner size={3} color="currentColor" thickness="border-2" />{:else}<Plus class="w-3.5 h-3.5" />{/if}
						Hinzufügen
					</button>
				</div>
			</section>

			<!-- Relations -->
			<section>
				<div class="pb-2 flex items-center justify-between">
					<h3 class="section-heading flex items-center gap-2">
						Verknüpfungen
						{#if ticket.relations.length > 0}<span class="text-xs font-mono normal-case tracking-normal" style="color: var(--text-muted);">{ticket.relations.length}</span>{/if}
					</h3>
					{#if !showAddRelation}
						<button onclick={openAddRelation}
							class="btn-subtle flex items-center gap-1 text-xs px-2 py-1">
							<Plus class="w-3 h-3" /> Hinzufügen
						</button>
					{/if}
				</div>
				<div class="hairline"></div>

				{#if showAddRelation}
					<div class="py-3 space-y-2" transition:slide={{ duration: 200 }}>
						<div class="grid grid-cols-2 gap-2">
							<select bind:value={relationType} class="input text-xs">
								{#each Object.entries(relationLabels) as [value, label]}<option {value}>{label}</option>{/each}
							</select>
							<select bind:value={relationTargetId} class="input text-xs">
								<option value={null}>Ticket wählen…</option>
								{#each projectTickets as t}<option value={t.id}>#{t.id} — {t.title}</option>{/each}
							</select>
						</div>
						<div class="flex justify-end gap-2">
							<button onclick={() => showAddRelation = false} class="btn-subtle px-3 py-1 text-xs" style="color: var(--text-muted);">Abbrechen</button>
							<button onclick={addRelation} disabled={!relationTargetId || isAddingRelation}
								class="btn-subtle px-3 py-1 text-xs font-semibold">
								Verknüpfen
							</button>
						</div>
					</div>
					<div class="hairline"></div>
				{/if}

				{#if ticket.relations.length === 0 && !showAddRelation}
					<div class="py-3 text-xs" style="color: var(--text-muted);">Keine Verknüpfungen</div>
				{:else if ticket.relations.length > 0}
					<div class="py-2 space-y-1">
						{#each ticket.relations as rel (rel.id)}
							<div class="flex items-center justify-between gap-2 py-1.5 text-xs">
								<span style="color: var(--text-muted);">
									{ticket.title}
									<span style="color: var(--accent);">{rel.direction === 'outgoing' ? relationLabels[rel.relation_type] : incomingRelationLabels[rel.relation_type]}</span>
									<a href="/tickets/{rel.other_ticket_id}" style="color: var(--text);">#{rel.other_ticket_id} — {rel.other_ticket_title}</a>
								</span>
								<button onclick={() => removeRelation(rel.id)} disabled={deletingRelationId === rel.id}
									class="shrink-0 p-1 rounded transition-all" style="color: var(--danger); opacity: {deletingRelationId === rel.id ? 0.5 : 1};">
									<X class="w-3 h-3" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Knowledge-Base-Notes -->
			{#if ticket.docs_required || ticket.linked_notes.length > 0}
				<section>
					<div class="pb-2">
						<h3 class="section-heading flex items-center gap-2">
							Knowledge Base
							{#if ticket.linked_notes.length > 0}<span class="text-xs font-mono normal-case tracking-normal" style="color: var(--text-muted);">{ticket.linked_notes.length}</span>{/if}
						</h3>
					</div>
					<div class="hairline"></div>
					{#if ticket.docs_required && ticket.linked_notes.length === 0}
						<div class="my-3 flex items-start gap-2 p-3 rounded-lg text-xs"
							style="background: color-mix(in srgb, var(--color-warning) 7%, transparent); border-left: 2px solid var(--color-warning); color: var(--color-warning);">
							<AlertTriangle class="w-4 h-4 shrink-0" />
							<span>Dieses Ticket hat <strong>Doku-Pflicht</strong>, aber noch keine verlinkte Note — es kann erst geschlossen werden, wenn eine Knowledge-Base-Note verlinkt ist (via <code>kabai_docs_link_ticket</code>) oder die Pflicht mit Begründung entfernt wird.</span>
						</div>
					{/if}
					{#if ticket.linked_notes.length > 0}
						<div class="py-2 space-y-1">
							{#each ticket.linked_notes as ln (`${ln.note_id}-${ln.relation}`)}
								<a href="/notes/{ln.slug}"
									class="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs transition-all hover:bg-[var(--color-surface-hover)]"
									style="{ln.archived ? 'opacity: 0.55;' : ''}">
									<Compass class="w-3.5 h-3.5 shrink-0 {ln.kind === 'hub' ? '' : 'hidden'}" style="color: var(--color-warning);" />
									<BookOpen class="w-3.5 h-3.5 shrink-0 {ln.kind === 'hub' ? 'hidden' : ''}" style="color: {ln.kind === 'adr' ? 'var(--color-secondary)' : 'var(--primary)'};" />
									<span class="font-medium px-1.5 py-0.5 rounded shrink-0" style="background: var(--color-surface-hover); color: var(--color-text-secondary);">{noteRelationLabels[ln.relation] ?? ln.relation}</span>
									<span class="truncate" style="color: var(--text);">{ln.title}</span>
									{#if ln.archived}<Archive class="w-3 h-3 shrink-0" style="color: var(--text-muted);" />{/if}
									<code class="ml-auto shrink-0 hidden sm:inline" style="color: var(--text-muted);">{ln.slug}</code>
								</a>
							{/each}
						</div>
					{:else if !ticket.docs_required}
						<div class="py-3 text-xs" style="color: var(--text-muted);">Keine Notes verlinkt</div>
					{/if}
				</section>
			{/if}

			<!-- Referenziert auf Canvas (#539, Rückrichtung von #528) -->
			{#if ticket.referenced_by_canvases.length > 0}
				<section>
					<div class="pb-2">
						<h3 class="section-heading flex items-center gap-2">
							Referenziert auf Canvas
							<span class="text-xs font-mono normal-case tracking-normal" style="color: var(--text-muted);">{ticket.referenced_by_canvases.length}</span>
						</h3>
					</div>
					<div class="hairline"></div>
					<div class="py-2 space-y-1">
						{#each ticket.referenced_by_canvases as cr (cr.canvas_id)}
							<a href="/canvases/{cr.canvas_id}"
								class="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs transition-all hover:bg-[var(--color-surface-hover)]">
								<Layers class="w-3.5 h-3.5 shrink-0" style="color: var(--primary);" />
								<span class="truncate" style="color: var(--text);">{cr.canvas_name}</span>
							</a>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Comments -->
			<section>
				<div class="pb-2">
					<h3 class="section-heading flex items-center gap-2">
						Kommentare
						{#if ticket.comments.length > 0}<span class="text-xs font-mono normal-case tracking-normal" style="color: var(--text-muted);">{ticket.comments.length}</span>{/if}
					</h3>
				</div>
				<div class="hairline"></div>
				{#if ticket.comments.length > 0}
					<div class="py-3 space-y-3">
						{#each ticket.comments as comment (comment.id)}
							<div class="flex gap-3">
								<div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
									style="background: var(--color-surface-hover); color: var(--color-text-secondary);">
									{initials(comment.author)}
								</div>
								<div class="flex-1 rounded-lg px-3 py-2.5" style="background: rgba(255,255,255,0.03);">
									<div class="flex items-center gap-2 mb-1">
										<span class="text-xs font-semibold" style="color: var(--text);">{comment.author}</span>
										<span class="text-xs font-mono" style="color: var(--text-muted);">{formatDate(comment.created_at, true)}</span>
									</div>
									<p class="text-sm whitespace-pre-wrap" style="color: var(--text);">{comment.comment_text}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
				<div class="pt-2 space-y-2">
					<textarea bind:value={newCommentText} class="input resize-none text-sm" rows="2" placeholder="Kommentar hinzufügen…"></textarea>
					<div class="flex justify-end">
						<button onclick={addComment} disabled={!newCommentText.trim() || isAddingComment}
							class="btn-subtle flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
							{#if isAddingComment}<Spinner size={3} color="currentColor" thickness="border-2" />{:else}<MessageSquare class="w-3.5 h-3.5" />{/if}
							Kommentieren
						</button>
					</div>
				</div>
			</section>
		</div>
	{/if}
</div>

<!-- Ticket #508: BannerConfirm statt window.confirm. TicketModal läuft innerhalb eines
     SidePanel (dessen Panel-Fläche z-50 + backdrop-filter trägt). backdrop-filter auf
     einem Vorfahren macht diesen zum containing block für position:fixed-Nachfahren —
     das Band bleibt also auf die Panelfläche begrenzt, muss dort aber sicher ÜBER dem
     Panelinhalt liegen. BannerConfirm bringt bereits z-[100] mit, klar über dem
     SidePanel-Scrim/Panel (z-50) — keine Anhebung nötig, nur sichergestellt. -->
<BannerConfirm
	open={pendingDeleteTicket}
	text={ticket ? `Ticket #${ticket.id} „${ticket.title}" löschen?` : ''}
	tone="danger"
	onConfirm={confirmDeleteTicket}
	onCancel={cancelDeleteTicket}
/>

<style>
	/* CSS-:hover statt JS-Handlern für den Menüpunkt im "Weitere Aktionen"-Dropdown (#507) */
	.actions-menu-item:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
	}
</style>
