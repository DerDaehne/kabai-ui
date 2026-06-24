<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plus } from 'lucide-svelte';
	import KanbanColumn from './KanbanColumn.svelte';
	import type { BoardStatus, Ticket } from '$lib/types';
	
	interface Props {
		projectId: number;
		statuses: BoardStatus[];
		tickets: Ticket[];
	}
	
	export let projectId: number;
	export let statuses: BoardStatus[];
	export let tickets: Ticket[];
	
	// Tickets nach Status gruppieren
	let groupedTickets: Array<{ status: BoardStatus; tickets: Ticket[] }> = [];
	$: groupedTickets = statuses.map(status => ({
		status,
		tickets: tickets.filter(t => t.status_id === status.id)
	}));
	
	// Neues Ticket erstellen
	function handleNewTicket(statusId: number) {
		goto(`/projects/${projectId}/tickets/new?status_id=${statusId}`);
	}
</script>

<div class="overflow-x-auto">
	<div class="flex gap-4 pb-4 min-w-max">
		{#each groupedTickets as { status, tickets: statusTickets }}
			<KanbanColumn
				status={status}
				tickets={statusTickets}
				projectId={projectId}
				onNewTicket={() => handleNewTicket(status.id)}
			/>
		{/each}
		
		<!-- Add new column placeholder -->
		<div class="w-64 flex-shrink-0 p-4 bg-[var(--border)] rounded-lg border-2 border-dashed border-[var(--border)]">
			<button 
				onclick={() => goto(`/projects/${projectId}/statuses`)}
				class="w-full flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
			>
				<Plus class="w-4 h-4" />
				Neue Spalte
			</button>
		</div>
	</div>
</div>
