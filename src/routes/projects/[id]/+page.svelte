<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Settings, Layers, Network, Inbox } from 'lucide-svelte';
	import KanbanBoard from '$components/board/KanbanBoard.svelte';
	import Modal from '$components/ui/Modal.svelte';
	import TicketModal from '$components/tickets/TicketModal.svelte';
	import StatusesModal from '$components/statuses/StatusesModal.svelte';
	import WorkflowModal from '$components/workflow/WorkflowModal.svelte';
	import InboxModal from '$components/inbox/InboxModal.svelte';
	import type { Project, BoardStatus, Ticket } from '$lib/types';

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

	// Kanban-Board zeigt keine Human-Intervention-Spalten (die laufen über die Inbox)
	$: kanbanStatuses = statuses.filter(s => !s.special_type);
	$: inboxTickets = tickets.filter(t => {
		const s = statuses.find(s => s.id === t.status_id);
		return s?.special_type === 'human_intervention';
	});

	// Echtzeit-Updates via SSE
	let movedTicketIds = new Set<number>();
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
						// sieht, dass sich am Ticket etwas getan hat.
						tickets = tickets.map(t => t.id === updated.id ? updated : t);
						movedTicketIds = new Set([...movedTicketIds, updated.id]);
						setTimeout(() => {
							movedTicketIds = new Set([...movedTicketIds].filter(id => id !== updated.id));
						}, 2000);
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
	});

	onDestroy(() => {
		eventSource?.close();
	});
</script>

<div class="w-full space-y-5">
	<!-- Header -->
	<div class="flex items-center justify-between gap-4" in:fly={{ y: -16, duration: 400, easing: quintOut }}>
		<div class="min-w-0">
			{#if project}
				<h1 class="text-2xl font-bold tracking-tight truncate" style="color: var(--text);">{project.name}</h1>
				{#if project.description}
					<p class="text-sm truncate mt-0.5" style="color: var(--text-muted);">{project.description}</p>
				{/if}
			{/if}
		</div>

		<div class="flex items-center gap-2 shrink-0">
			<button onclick={() => showInbox = true}
				class="relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200"
				style="color: var(--text-muted); background: var(--border);"
				onmouseenter={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.1)'; e.currentTarget.style.color = 'var(--primary)'; }}
				onmouseleave={(e) => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
				<Inbox class="w-4 h-4" />
				<span class="hidden sm:inline">Inbox</span>
				{#if inboxTickets.length > 0}
					<span class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold"
						style="background: var(--primary); color: #000; box-shadow: 0 0 8px var(--primary-glow);">
						{inboxTickets.length}
					</span>
				{/if}
			</button>
			<button onclick={() => showStatuses = true}
				class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200"
				style="color: var(--text-muted); background: var(--border);"
				onmouseenter={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.1)'; e.currentTarget.style.color = 'var(--primary)'; }}
				onmouseleave={(e) => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
				<Layers class="w-4 h-4" />
				<span class="hidden sm:inline">Statuses</span>
			</button>
			<button onclick={() => showWorkflow = true}
				class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200"
				style="color: var(--text-muted); background: var(--border);"
				onmouseenter={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.12)'; e.currentTarget.style.color = 'var(--accent)'; }}
				onmouseleave={(e) => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
				<Network class="w-4 h-4" />
				<span class="hidden sm:inline">Workflow</span>
			</button>
			<button onclick={() => goto(`/projects/${id}/settings`)}
				class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200"
				style="color: var(--text-muted); background: var(--border);"
				onmouseenter={(e) => { e.currentTarget.style.background = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text)'; }}
				onmouseleave={(e) => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
				<Settings class="w-4 h-4" />
				<span class="hidden sm:inline">Einstellungen</span>
			</button>
		</div>
	</div>

	{#if error}
		<div class="p-4 rounded-xl border text-sm" style="background: rgba(255,34,85,0.08); border-color: rgba(255,34,85,0.4); color: var(--danger);" in:fly={{ y: 8, duration: 200 }}>{error}</div>
	{/if}

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4" in:fade={{ duration: 200 }}>
			<div class="relative w-10 h-10">
				<div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
					style="border-top-color: var(--primary); box-shadow: 0 0 16px var(--primary-glow);"></div>
			</div>
			<p class="text-sm" style="color: var(--text-muted);">Lade Board…</p>
		</div>

	{:else if project && kanbanStatuses.length > 0}
		<div in:fly={{ y: 16, duration: 400, easing: quintOut }}>
			<KanbanBoard projectId={project.id} statuses={kanbanStatuses} bind:tickets {onTicketClick} onOpenStatuses={() => showStatuses = true} {movedTicketIds} />
		</div>

	{:else if project}
		<div class="flex flex-col items-center justify-center py-24 rounded-2xl border" style="border-color: var(--border); background: var(--card-bg);" in:fade={{ duration: 300 }}>
			<div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style="background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2);">
				<Layers class="w-8 h-8" style="color: var(--text-muted);" />
			</div>
			<h3 class="text-lg font-semibold mb-2" style="color: var(--text);">Keine Board-Statuses</h3>
			<p class="mb-6 text-sm" style="color: var(--text-muted);">Erstellen Sie Statuses, um das Kanban-Board zu konfigurieren.</p>
			<button onclick={() => showStatuses = true} class="btn btn-primary">Statuses erstellen</button>
		</div>
	{/if}
</div>

<!-- Inbox Modal -->
<Modal open={showInbox} onClose={() => showInbox = false} size="md">
	{#if showInbox}
		<InboxModal tickets={inboxTickets} onTicketClick={(id) => { showInbox = false; onTicketClick(id); }} onClose={() => showInbox = false} {movedTicketIds} />
	{/if}
</Modal>

<!-- Ticket Detail Modal -->
<Modal open={openTicketId !== null} onClose={() => openTicketId = null} size="lg">
	{#if openTicketId !== null}
		<TicketModal ticketId={openTicketId} onClose={() => openTicketId = null} onDeleted={onTicketDeleted} {liveUpdateSignal} />
	{/if}
</Modal>

<!-- Statuses Modal -->
<Modal open={showStatuses} onClose={onStatusesClose} size="lg">
	{#if showStatuses && project}
		<StatusesModal projectId={project.id} onClose={onStatusesClose} />
	{/if}
</Modal>

<!-- Workflow Modal -->
<Modal open={showWorkflow} onClose={() => showWorkflow = false} size="xl">
	{#if showWorkflow && project}
		<WorkflowModal projectId={project.id} onClose={() => showWorkflow = false} />
	{/if}
</Modal>
