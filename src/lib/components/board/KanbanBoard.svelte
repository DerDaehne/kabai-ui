<script lang="ts">
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Plus } from 'lucide-svelte';
	import KanbanColumn from './KanbanColumn.svelte';
	import type { BoardStatus, Ticket } from '$lib/types';

	export let projectId: number;
	export let statuses: BoardStatus[];
	export let tickets: Ticket[];
	export let onTicketClick: (ticketId: number) => void = () => {};
	export let onOpenStatuses: () => void = () => {};

	let dragError = '';
	let dragErrorTimer: ReturnType<typeof setTimeout>;

	$: groupedTickets = statuses.map(status => ({
		status,
		tickets: tickets.filter(t => t.status_id === status.id)
	}));

	function handleNewTicket(statusId: number) {
		goto(`/projects/${projectId}/tickets/new?status_id=${statusId}`);
	}

	async function handleTicketDrop(ticketId: number, toStatusId: number) {
		const ticket = tickets.find(t => t.id === ticketId);
		if (!ticket || ticket.status_id === toStatusId) return;
		const prevStatusId = ticket.status_id;
		tickets = tickets.map(t => t.id === ticketId ? { ...t, status_id: toStatusId } : t);
		try {
			const res = await fetch(`/api/tickets/${ticketId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status_id: toStatusId })
			});
			const result = await res.json();
			if (!result.ok) {
				tickets = tickets.map(t => t.id === ticketId ? { ...t, status_id: prevStatusId } : t);
				showError(result.error || 'Transition nicht erlaubt');
			}
		} catch {
			tickets = tickets.map(t => t.id === ticketId ? { ...t, status_id: prevStatusId } : t);
			showError('Netzwerkfehler');
		}
	}

	function showError(msg: string) {
		dragError = msg;
		clearTimeout(dragErrorTimer);
		dragErrorTimer = setTimeout(() => dragError = '', 4000);
	}
</script>

<div class="w-full">
	{#if dragError}
		<div class="mb-4 px-4 py-3 rounded-xl border text-sm"
			style="background: rgba(255,34,85,0.08); border-color: rgba(255,34,85,0.4); color: var(--danger);"
			in:fly={{ y: -8, duration: 200 }} out:fade={{ duration: 200 }}>
			{dragError}
		</div>
	{/if}

	<div class="flex gap-4 pb-4 overflow-x-auto">
		{#each groupedTickets as { status, tickets: statusTickets }, i (status.id)}
			<div in:fly={{ y: 24, duration: 350, delay: i * 50, easing: quintOut }} class="flex-1 min-w-[260px] max-w-[340px]">
				<KanbanColumn
					{status}
					tickets={statusTickets}
					{projectId}
					colorIndex={i}
					onNewTicket={() => handleNewTicket(status.id)}
					onTicketDrop={(ticketId) => handleTicketDrop(ticketId, status.id)}
					{onTicketClick}
					{onOpenStatuses}
				/>
			</div>
		{/each}

		<div class="flex-none min-w-[200px] flex items-start pt-1" in:fly={{ y: 24, duration: 350, delay: groupedTickets.length * 50, easing: quintOut }}>
			<button
				onclick={onOpenStatuses}
				class="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed text-sm transition-all duration-200 group"
				style="border-color: var(--border-bright); color: var(--text-muted);"
				onmouseenter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
				onmouseleave={(e) => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
				<Plus class="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
				Neue Spalte
			</button>
		</div>
	</div>
</div>
