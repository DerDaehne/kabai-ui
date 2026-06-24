<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plus, Edit2, Eye } from 'lucide-svelte';
	import TicketCard from './TicketCard.svelte';
	import type { BoardStatus, Ticket } from '$lib/types';
	
	interface Props {
		status: BoardStatus;
		tickets: Ticket[];
		projectId: number;
		onNewTicket: () => void;
	}
	
	export let status: BoardStatus;
	export let tickets: Ticket[];
	export let projectId: number;
	export let onNewTicket: () => void;
	
	// Tickets sortieren nach updated_at (neueste zuerst)
	let sortedTickets: Ticket[] = [];
	$: sortedTickets = [...tickets].sort((a, b) => 
		new Date(b.updated_at || b.created_at).getTime() - 
		new Date(a.updated_at || a.created_at).getTime()
	);
</script>

<div class="w-64 flex-shrink-0">
	<!-- Column Header -->
	<div class="bg-[var(--secondary)] text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
		<div class="flex items-center gap-2 overflow-hidden">
			<span class="font-medium truncate">{status.display_name}</span>
			<span class="text-xs bg-white/20 px-2 py-0.5 rounded-full">{tickets.length}</span>
		</div>
		<div class="flex gap-1">
			<button 
				onclick={() => goto(`/projects/${projectId}/statuses`)}
				class="p-1 rounded hover:bg-white/20 transition-colors"
				title="Status bearbeiten"
			>
				<Edit2 class="w-3 h-3" />
			</button>
			<button 
				onclick={onNewTicket}
				class="p-1 rounded hover:bg-white/20 transition-colors"
				title="Neues Ticket"
			>
				<Plus class="w-3 h-3" />
			</button>
		</div>
	</div>
	
	<!-- Column Body -->
	<div class="bg-[var(--card-bg)] border border-t-0 border-[var(--border)] rounded-b-lg p-2 space-y-2 min-h-[200px]">
		{#if sortedTickets.length === 0}
			<!-- Empty Column -->
			<div class="p-4 text-center text-[var(--text-muted)] text-sm">
				<p>Keine Tickets</p>
				<button 
					onclick={onNewTicket}
					class="text-[var(--primary)] hover:underline mt-1"
				>
					+ Neues Ticket
				</button>
			</div>
		{:else}
			<!-- Tickets -->
			{#each sortedTickets as ticket}
				<TicketCard
					ticket={ticket}
					projectId={projectId}
					status={status}
				/>
			{/each}
		{/if}
		
		<!-- Add Ticket Button (footer) -->
		<button 
			onclick={onNewTicket}
			class="w-full flex items-center justify-center gap-2 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] rounded-md transition-colors"
		>
			<Plus class="w-4 h-4" />
			Neues Ticket
		</button>
	</div>
</div>
