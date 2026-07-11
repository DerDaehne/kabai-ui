<script lang="ts">
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { Plus, Pencil, Layers } from 'lucide-svelte';
	import TicketCard from './TicketCard.svelte';
	import type { BoardStatus, Ticket } from '$lib/types';

	interface Props {
		status: BoardStatus;
		tickets: Ticket[];
		projectId: number;
		colorIndex: number;
		onNewTicket: () => void;
		onTicketDrop: (ticketId: number) => void;
	}

	export let status: BoardStatus;
	export let tickets: Ticket[];
	export let projectId: number;
	export let colorIndex: number = 0;
	export let onNewTicket: () => void;
	export let onTicketDrop: (ticketId: number) => void;
	export let onTicketClick: (ticketId: number) => void = () => {};
	export let onOpenStatuses: () => void = () => {};
	export let movedTicketIds: Set<number> = new Set();

	const accentColors = [
		{ border: '#00d4ff', glow: 'rgba(0,212,255,0.2)', bg: 'rgba(0,212,255,0.08)' },
		{ border: '#8b5cf6', glow: 'rgba(139,92,246,0.2)', bg: 'rgba(139,92,246,0.08)' },
		{ border: '#00ff87', glow: 'rgba(0,255,135,0.2)', bg: 'rgba(0,255,135,0.08)' },
		{ border: '#ffd000', glow: 'rgba(255,208,0,0.2)', bg: 'rgba(255,208,0,0.08)' },
		{ border: '#ff2255', glow: 'rgba(255,34,85,0.2)', bg: 'rgba(255,34,85,0.08)' },
	];
	$: accent = accentColors[colorIndex % accentColors.length];

	let isDragOver = false;

	const PAGE_SIZE = 25;
	let visibleCount = PAGE_SIZE;

	$: sortedTickets = [...tickets].sort((a, b) =>
		new Date(b.updated_at || b.created_at).getTime() -
		new Date(a.updated_at || a.created_at).getTime()
	);
	$: displayedTickets = sortedTickets.slice(0, visibleCount);
	$: hiddenCount = sortedTickets.length - displayedTickets.length;

	function loadMore() { visibleCount += PAGE_SIZE; }

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		// Only clear if leaving the column entirely (not entering a child)
		if (!e.currentTarget || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
			isDragOver = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const ticketId = parseInt(e.dataTransfer?.getData('ticketId') || '');
		if (!isNaN(ticketId)) onTicketDrop(ticketId);
	}
</script>

<!-- h-full: der Wrapper im Board wird per Flex-Stretch auf die Höhe der
     längsten Spalte gezogen — die Karte muss ihn füllen, damit kurze/leere
     Spalten gleich hoch sind und ihre Drop-Zone (flex-1) mitwächst (#18) -->
<div class="flex flex-col h-full rounded-xl overflow-hidden transition-all duration-200"
	style="border: 1px solid {isDragOver ? accent.border : 'var(--border)'}; background: var(--card-bg); box-shadow: {isDragOver ? `0 0 20px ${accent.glow}` : '0 2px 12px rgba(0,0,0,0.2)'};"
>
	<!-- Column Header -->
	<div
		class="px-4 py-3 flex items-center justify-between gap-2"
		style="background: {accent.bg}; border-bottom: 1px solid {accent.border}40;"
	>
		<div class="flex items-center gap-2 min-w-0">
			<div class="w-2 h-2 rounded-full shrink-0" style="background: {accent.border}; box-shadow: 0 0 6px {accent.border};"></div>
			<span class="font-semibold truncate text-sm" style="color: var(--text);">{status.display_name}</span>
			<span
				class="shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium"
				style="background: {accent.border}20; color: {accent.border}; border: 1px solid {accent.border}40;"
			>{tickets.length}</span>
		</div>
		<div class="flex items-center gap-1 shrink-0">
			<button
				onclick={onOpenStatuses}
				class="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200"
				style="color: var(--text-muted);"
				onmouseenter={(e) => { e.currentTarget.style.background = accent.bg; e.currentTarget.style.color = accent.border; }}
				onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
				title="Status bearbeiten"
			>
				<Pencil class="w-3 h-3" />
			</button>
			<button
				onclick={onNewTicket}
				class="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200"
				style="color: var(--text-muted);"
				onmouseenter={(e) => { e.currentTarget.style.background = accent.bg; e.currentTarget.style.color = accent.border; }}
				onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
				title="Neues Ticket"
			>
				<Plus class="w-3.5 h-3.5" />
			</button>
		</div>
	</div>

	<!-- Drop Zone Body -->
	<div
		class="flex-1 p-2 space-y-2 min-h-[160px] transition-all duration-200"
		style="background: {isDragOver ? accent.bg : 'transparent'};"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	>
		{#if sortedTickets.length === 0}
			<div
				class="flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed text-xs transition-all duration-200"
				style="border-color: {isDragOver ? accent.border : 'var(--border)'}; color: var(--text-muted);"
			>
				{#if isDragOver}
					<div class="w-8 h-8 rounded-full flex items-center justify-center mb-2" style="background: {accent.bg}; color: {accent.border};">
						<Plus class="w-4 h-4" />
					</div>
					<span style="color: {accent.border};">Hier ablegen</span>
				{:else}
					Keine Tickets
					<button onclick={onNewTicket} class="mt-1 transition-colors" style="color: var(--primary);" onmouseenter={(e) => e.currentTarget.style.opacity = '0.7'} onmouseleave={(e) => e.currentTarget.style.opacity = '1'}>
						+ Neu
					</button>
				{/if}
			</div>
		{:else}
			{#each displayedTickets as ticket (ticket.id)}
				<div animate:flip={{ duration: 250 }} in:fly={{ y: -12, duration: 200 }} out:fly={{ y: 8, duration: 150, opacity: 0 }}>
					<TicketCard {ticket} {projectId} {status} {onTicketClick} highlight={movedTicketIds.has(ticket.id)} />
				</div>
			{/each}
			{#if hiddenCount > 0}
				<button
					onclick={loadMore}
					in:fly={{ y: -8, duration: 200 }}
					class="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed text-xs font-medium transition-all duration-200"
					style="border-color: {accent.border}40; color: {accent.border};"
					onmouseenter={(e) => { e.currentTarget.style.background = accent.bg; e.currentTarget.style.borderColor = accent.border; }}
					onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${accent.border}40`; }}
				>
					<Layers class="w-3.5 h-3.5" />
					+{Math.min(hiddenCount, PAGE_SIZE)} weitere laden ({hiddenCount} verbleiben)
				</button>
			{/if}
		{/if}
	</div>

	<!-- Footer -->
	<button
		onclick={onNewTicket}
		class="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs transition-all duration-200"
		style="color: var(--text-muted); border-top: 1px solid var(--border);"
		onmouseenter={(e) => { e.currentTarget.style.background = accent.bg; e.currentTarget.style.color = accent.border; }}
		onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
	>
		<Plus class="w-3.5 h-3.5" />
		Neues Ticket
	</button>
</div>
