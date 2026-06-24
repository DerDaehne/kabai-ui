<script lang="ts">
	import type { BoardStatus, Ticket } from '$lib/types';

	export let ticket: Ticket;
	export let projectId: number;
	export let status: BoardStatus;
	export let onTicketClick: (ticketId: number) => void = () => {};

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
	class="p-3 rounded-lg border cursor-pointer select-none transition-all duration-200"
	style="background: {isDragging ? 'var(--card-bg-hover)' : '#0a0a18'}; border-color: {isDragging ? 'var(--primary)' : 'var(--border)'}; opacity: {isDragging ? 0.5 : 1}; box-shadow: {isDragging ? '0 0 16px var(--primary-glow)' : 'none'}; transform: {isDragging ? 'rotate(1.5deg) scale(1.02)' : 'none'};"
	onmouseenter={(e) => { if (!isDragging) e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
	onmouseleave={(e) => { if (!isDragging) e.currentTarget.style.borderColor = 'var(--border)'; }}
>
	<p class="text-sm font-medium leading-snug mb-2" style="color: var(--text);">{ticket.title}</p>
	<div class="flex items-center justify-between gap-2">
		<span class="text-xs font-mono" style="color: var(--text-muted);">#{ticket.id}</span>
		{#if assigneeInitials}
			<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
				style="background: hsl({hue},70%,25%); color: hsl({hue},80%,70%); border: 1px solid hsl({hue},70%,40%);"
				title={ticket.assignee || ''}>
				{assigneeInitials}
			</div>
		{/if}
	</div>
</div>
