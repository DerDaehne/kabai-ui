<script lang="ts">
	import { Bot, Flag, BookOpen, AlertTriangle } from 'lucide-svelte';
	import type { BoardStatus, Ticket } from '$lib/types';

	export let ticket: Ticket;
	export let projectId: number;
	export let status: BoardStatus;
	export let onTicketClick: (ticketId: number) => void = () => {};
	export let highlight = false;

	let isDragging = false;

	$: assigneeInitials = ticket.assignee
		? ticket.assignee.split(' ').map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('')
		: null;

	const avatarHues = [195, 270, 150, 45, 345, 310, 220, 175];
	$: hue = avatarHues[ticket.id % avatarHues.length];

	function handleDragStart(e: DragEvent) {
		isDragging = true;
		e.dataTransfer?.setData('ticketId', String(ticket.id));
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function handleDragEnd() { isDragging = false; }
</script>

<div
	draggable="true"
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	onclick={() => onTicketClick(ticket.id)}
	class="ticket-card min-h-[92px] flex flex-col p-3 rounded-lg border cursor-pointer select-none transition-all duration-200"
	class:is-dragging={isDragging}
	style="background: {isDragging ? 'var(--card-bg-hover)' : 'var(--card-bg)'}; border-color: {isDragging ? 'var(--primary)' : highlight ? 'var(--primary)' : ticket.type === 'epic' ? 'rgba(255,208,0,0.35)' : 'var(--border)'}; opacity: {isDragging ? 0.5 : 1};{isDragging ? ' transform: rotate(1.5deg) scale(1.02);' : ''}"
>
	{#if ticket.type === 'epic'}
		<div class="flex items-center gap-1 mb-1.5 text-xs font-semibold" style="color: #ffd000;">
			<Flag class="w-3 h-3" /> Epic
		</div>
	{/if}
	<p class="text-sm font-medium leading-snug mb-2" style="color: var(--text);">{ticket.title}</p>
	<div class="mt-auto flex items-center justify-between gap-2">
		<div class="flex items-center gap-1.5 min-w-0">
			<span class="text-xs font-mono shrink-0" style="color: var(--text-muted);">#{ticket.id}</span>
			{#if ticket.model}
				<span class="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate max-w-[100px]"
					style="background: rgba(139,92,246,0.12); color: var(--accent); border: 1px solid rgba(139,92,246,0.25);"
					title={ticket.model}>
					<Bot class="w-2.5 h-2.5 shrink-0" />
					{ticket.model.split('-').slice(0, 2).join('-')}
				</span>
			{/if}
			{#if ticket.docs_required && !(ticket.linked_notes_count ?? 0)}
				<span class="shrink-0" title="Doku-Pflicht: keine Knowledge-Base-Note verlinkt — Ticket kann so nicht geschlossen werden">
					<AlertTriangle class="w-3 h-3" style="color: hsl(35, 90%, 60%);" />
				</span>
			{:else if (ticket.linked_notes_count ?? 0) > 0}
				<span class="shrink-0" title="{ticket.linked_notes_count} Knowledge-Base-Note{(ticket.linked_notes_count ?? 0) !== 1 ? 's' : ''} verlinkt">
					<BookOpen class="w-3 h-3" style="color: var(--accent);" />
				</span>
			{/if}
		</div>
		{#if assigneeInitials}
			<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
				style="background: hsl({hue},70%,25%); color: hsl({hue},80%,70%); border: 1px solid hsl({hue},70%,40%);"
				title={ticket.assignee || ''}>
				{assigneeInitials}
			</div>
		{/if}
	</div>
</div>

<style>
	.ticket-card:hover:not(.is-dragging) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		border-color: var(--border-bright);
	}
</style>
