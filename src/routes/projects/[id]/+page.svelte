<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Settings, Layers, Network, Inbox, Archive } from 'lucide-svelte';
	import KanbanBoard from '$components/board/KanbanBoard.svelte';
	import SidePanel from '$components/ui/SidePanel.svelte';
	import BottomSheet from '$components/ui/BottomSheet.svelte';
	import TicketModal from '$components/tickets/TicketModal.svelte';
	import StatusesModal from '$components/statuses/StatusesModal.svelte';
	import WorkflowModal from '$components/workflow/WorkflowModal.svelte';
	import InboxModal from '$components/inbox/InboxModal.svelte';
	import NewTicketSheet from '$components/tickets/NewTicketSheet.svelte';
	import { pushAiEvent, sseConnected } from '$lib/stores/aiActivity';
	import { openTicketRequest } from '$lib/stores/ui';
	import { paletteActions } from '$lib/stores/commandPalette';
	import type { Project, BoardStatus, Ticket } from '$lib/types';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';

	$: id = $page.params.id;

	let project: Project | null = null;
	let statuses: BoardStatus[] = [];
	let tickets: Ticket[] = [];
	let isLoading = true;
	let error = '';

	// Modal state
	let openTicketId: number | null = null;
	let showStatuses = false;
	let showWorkflow = false;
	let showInbox = false;

	// Ticket #506: "Neues Ticket" öffnet jetzt das von unten hereingeschobene
	// BottomSheet statt zur Route /tickets/new zu navigieren. Die Route bleibt
	// als Deep-Link erhalten (siehe .../tickets/new/+page.svelte).
	let showNewTicket = false;
	let newTicketStatusId: number | null = null;

	function openNewTicketSheet(statusId: number) {
		newTicketStatusId = statusId;
		showNewTicket = true;
	}

	function closeNewTicketSheet() {
		showNewTicket = false;
	}

	async function handleTicketCreated(_ticket: { id: number }) {
		closeNewTicketSheet();
		const tr = await fetch(`/api/projects/${id}/tickets`).then(r => r.json());
		if (tr.ok) tickets = tr.data;
	}

	// Kanban-Board zeigt keine Human-Intervention-Spalten (die laufen über die Inbox)
	$: kanbanStatuses = statuses.filter(s => !s.special_type);

	// Ticket #537: Command-Palette-Aktionen dieser Seite. Das Board hat kein
	// eigenes Suchfeld (Design-Entscheidung: "/" ist hier bewusst ein No-op —
	// siehe Root-Layout, das kein focusSearchField für diese Seite gesetzt
	// bekommt), daher wird hier nur paletteActions registriert. "Neues Ticket"
	// aus der Palette hat keinen Spalten-Kontext (kein Klick auf eine
	// bestimmte Spalte) — Default ist die am weitesten links stehende Spalte
	// (kanbanStatuses ist nach position sortiert, siehe fetchBoardData).
	$: {
		const actions = [];
		if (kanbanStatuses.length > 0) {
			actions.push({
				id: 'new-ticket',
				label: 'Neues Ticket',
				run: () => openNewTicketSheet(kanbanStatuses[0].id)
			});
		}
		actions.push({ id: 'manage-statuses', label: 'Spalten verwalten', run: () => (showStatuses = true) });
		paletteActions.set(actions);
	}

	onDestroy(() => {
		paletteActions.set([]);
	});
	$: inboxTickets = tickets.filter(t => {
		const s = statuses.find(s => s.id === t.status_id);
		return s?.special_type === 'human_intervention';
	});

	// Echtzeit-Updates via SSE
	// orbitSignals: ticket_id -> monoton steigender Zähler, erhöht sich bei jedem
	// KI-Event für dieses Ticket. Treibt die einmalige Orbit-Highlight-Animation
	// auf der jeweiligen TicketCard (ersetzt die alte movedTicketIds-Border-Färbung).
	let orbitSignals = new Map<number, number>();
	let orbitSignalSeq = 0;
	function bumpOrbitSignal(ticketId: number) {
		orbitSignalSeq += 1;
		orbitSignals = new Map(orbitSignals).set(ticketId, orbitSignalSeq);
	}

	let eventSource: EventSource | null = null;
	// Signalisiert dem offenen TicketModal, dass sich sein Ticket geändert hat
	// (z.B. ein KI-Agent kommentiert, während der Mensch das Ticket offen hat).
	let liveUpdateSignal: { ticketId: number; seq: number } | null = null;

	// Verhindert, dass eine ältere Fetch-Response eine neuere überschreibt, wenn
	// mehrere SSE-Events kurz hintereinander für dasselbe Ticket eintreffen
	// (z.B. mehrere Kommentare/Tasks eines KI-Agenten in schneller Folge).
	const ticketFetchSeq = new Map<number, number>();

	function handleSSEMessage(event: MessageEvent) {
		try {
			const payload = JSON.parse(event.data) as {
				op: 'INSERT' | 'UPDATE' | 'DELETE';
				ticket_id: number;
				status_id: number;
				project_id: number;
			};

			pushAiEvent(payload.ticket_id, payload.op);

			if (payload.op === 'DELETE') {
				tickets = tickets.filter(t => t.id !== payload.ticket_id);
				return;
			}

			// INSERT oder UPDATE: Ticket vom Server laden
			const seq = (ticketFetchSeq.get(payload.ticket_id) ?? 0) + 1;
			ticketFetchSeq.set(payload.ticket_id, seq);

			fetch(`/api/tickets/${payload.ticket_id}`)
				.then(r => r.json())
				.then(res => {
					if (!res.ok) return;
					// Zwischenzeitlich ist ein neueres Event für dasselbe Ticket eingetroffen —
					// diese (evtl. ältere) Response verwerfen.
					if (ticketFetchSeq.get(payload.ticket_id) !== seq) return;

					const updated = res.data.ticket;
					const existing = tickets.find(t => t.id === updated.id);

					if (!existing) {
						tickets = [...tickets, updated];
					} else {
						// Jede Änderung markieren (Status-Wechsel, aber auch Description/Assignee/
						// Kommentare/Tasks durch KI-Agenten ohne Spaltenwechsel), damit der Nutzer
						// sieht, dass sich am Ticket etwas getan hat — einmalige Orbit-Animation
						// statt permanenter Border-Färbung.
						tickets = tickets.map(t => t.id === updated.id ? updated : t);
						bumpOrbitSignal(updated.id);
					}

					if (openTicketId === updated.id) {
						liveUpdateSignal = { ticketId: updated.id, seq };
					}
				})
				.catch(() => {});
		} catch { /* JSON parse error or closed */ }
	}

	async function fetchBoardData() {
		try {
			isLoading = true;
			const [pr, sr, tr] = await Promise.all([
				fetch(`/api/projects/${id}`).then(r => r.json()),
				fetch(`/api/projects/${id}/statuses`).then(r => r.json()),
				fetch(`/api/projects/${id}/tickets`).then(r => r.json())
			]);
			if (!pr.ok) { error = pr.error || 'Projekt nicht gefunden'; return; }
			project = pr.data;
			if (sr.ok) statuses = sr.data.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
			if (tr.ok) tickets = tr.data;
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	function onTicketClick(ticketId: number) {
		openTicketId = ticketId;
	}

	// Klick in der AI-Activity-Rail (liegt im Layout) öffnet das Ticket-Sidepanel
	// auf dieser Seite; Store danach zurücksetzen, damit ein erneuter Klick auf
	// dasselbe Ticket wieder greift.
	$: if ($openTicketRequest !== null) {
		onTicketClick($openTicketRequest);
		openTicketRequest.set(null);
	}

	function onTicketDeleted() {
		// Remove deleted ticket from board
		if (openTicketId) tickets = tickets.filter(t => t.id !== openTicketId);
	}

	// After closing statuses modal, refresh statuses (user may have added/changed)
	async function onStatusesClose() {
		showStatuses = false;
		const res = await fetch(`/api/projects/${id}/statuses`).then(r => r.json());
		if (res.ok) {
			statuses = res.data.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
			// Refresh tickets too in case status changes affect display
			const tr = await fetch(`/api/projects/${id}/tickets`).then(r => r.json());
			if (tr.ok) tickets = tr.data;
		}
	}

	onMount(async () => {
		await fetchBoardData();
		eventSource = new EventSource(`/api/projects/${id}/events`);
		eventSource.onmessage = handleSSEMessage;
		eventSource.onopen = () => { sseConnected.set(true); };
		eventSource.onerror = () => { sseConnected.set(false); };
	});

	onDestroy(() => {
		eventSource?.close();
		sseConnected.set(false);
	});
</script>

<div class="w-full space-y-5">
	<!-- Header -->
	<div class="flex items-center justify-between gap-4" in:fly={{ y: -16, duration: 400, easing: quintOut }}>
		<div class="min-w-0">
			{#if project}
				<h1 class="text-xl font-semibold tracking-tight truncate" style="color: var(--text);">{project.name}</h1>
				{#if project.description}
					<p class="text-xs truncate mt-0.5" style="color: var(--text-muted);" title={project.description}>{project.description}</p>
				{/if}
			{/if}
		</div>

		<div class="flex items-center gap-2 shrink-0">
			<button onclick={() => showInbox = true}
				class="btn-subtle relative flex items-center gap-2 px-3 py-2 text-sm">
				<Inbox class="w-4 h-4" />
				<span class="hidden sm:inline">Inbox</span>
				{#if inboxTickets.length > 0}
					<span class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold"
						style="background: var(--primary); color: #000;">
						{inboxTickets.length}
					</span>
				{/if}
			</button>
			<button onclick={() => showStatuses = true}
				class="btn-subtle flex items-center gap-2 px-3 py-2 text-sm">
				<Layers class="w-4 h-4" />
				<span class="hidden sm:inline">Statuses</span>
			</button>
			<button onclick={() => showWorkflow = true}
				class="btn-subtle flex items-center gap-2 px-3 py-2 text-sm">
				<Network class="w-4 h-4" />
				<span class="hidden sm:inline">Workflow</span>
			</button>
			<button onclick={() => goto(`/projects/${id}/settings`)}
				class="btn-subtle flex items-center gap-2 px-3 py-2 text-sm">
				<Settings class="w-4 h-4" />
				<span class="hidden sm:inline">Einstellungen</span>
			</button>
		</div>
	</div>

	{#if error}
		<ErrorBanner message={error} />
	{/if}

	{#if project?.archived}
		<div class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
			style="background: color-mix(in srgb, var(--color-warning) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent); color: var(--color-warning);">
			<Archive class="w-4 h-4 shrink-0" />
			Dieses Projekt ist archiviert und schreibgeschützt. Reaktiviere es in der Projekte-Übersicht, um Änderungen vorzunehmen.
		</div>
	{/if}

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4" in:fade={{ duration: 200 }}>
			<Spinner />
			<p class="text-sm" style="color: var(--text-muted);">Lade Board…</p>
		</div>

	{:else if project && kanbanStatuses.length > 0}
		<div in:fly={{ y: 16, duration: 400, easing: quintOut }}>
			<KanbanBoard projectId={project.id} statuses={kanbanStatuses} bind:tickets {onTicketClick} onOpenStatuses={() => showStatuses = true} onNewTicket={openNewTicketSheet} {orbitSignals} />
		</div>

	{:else if project}
		<div class="flex flex-col items-center justify-center py-24 rounded-2xl card" in:fade={{ duration: 300 }}>
			<div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style="background: color-mix(in srgb, var(--color-primary) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);">
				<Layers class="w-8 h-8" style="color: var(--text-muted);" />
			</div>
			<h3 class="text-lg font-semibold mb-2" style="color: var(--text);">Keine Board-Statuses</h3>
			<p class="mb-6 text-sm" style="color: var(--text-muted);">Erstellen Sie Statuses, um das Kanban-Board zu konfigurieren.</p>
			<button onclick={() => showStatuses = true} class="btn btn-primary">Statuses erstellen</button>
		</div>
	{/if}
</div>

<!-- Inbox Panel -->
<SidePanel open={showInbox} onClose={() => showInbox = false} size="md" ariaLabel="Inbox">
	{#if showInbox}
		<InboxModal tickets={inboxTickets} onTicketClick={(id) => { showInbox = false; onTicketClick(id); }} onClose={() => showInbox = false} {orbitSignals} />
	{/if}
</SidePanel>

<!-- Ticket Detail Panel -->
<SidePanel open={openTicketId !== null} onClose={() => openTicketId = null} size="md" ariaLabel="Ticket-Details">
	{#if openTicketId !== null}
		<TicketModal ticketId={openTicketId} onClose={() => openTicketId = null} onDeleted={onTicketDeleted} {liveUpdateSignal} />
	{/if}
</SidePanel>

<!-- Statuses Panel -->
<SidePanel open={showStatuses} onClose={onStatusesClose} size="md" ariaLabel="Spalten verwalten">
	{#if showStatuses && project}
		<StatusesModal projectId={project.id} onClose={onStatusesClose} />
	{/if}
</SidePanel>

<!-- Workflow Panel -->
<SidePanel open={showWorkflow} onClose={() => showWorkflow = false} size="xl" ariaLabel="Workflow-Editor">
	{#if showWorkflow && project}
		<WorkflowModal projectId={project.id} onClose={() => showWorkflow = false} />
	{/if}
</SidePanel>

<!-- Neues Ticket -->
<BottomSheet open={showNewTicket} title="Neues Ticket" onClose={closeNewTicketSheet}>
	{#if project}
		<NewTicketSheet
			projectId={id ?? ''}
			initialStatusId={newTicketStatusId}
			onCreated={handleTicketCreated}
			onCancel={closeNewTicketSheet}
		/>
	{/if}
</BottomSheet>
