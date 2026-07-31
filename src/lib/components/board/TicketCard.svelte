<script lang="ts">
	import { Bot, Flag, BookOpen, AlertTriangle, Sparkles } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import OrbitHighlight from '$components/ui/OrbitHighlight.svelte';
	import type { BoardStatus, Ticket } from '$lib/types';
	import { initials } from '$lib/utils/format';

	export let ticket: Ticket;
	export let projectId: number;
	export let status: BoardStatus;
	export let onTicketClick: (ticketId: number) => void = () => {};
	// Zähler/Timestamp, der bei jedem KI-Event für dieses Ticket hochgezählt wird
	// (siehe src/lib/stores/aiActivity.ts). Ersetzt die alte permanente
	// highlight-Border (movedTicketIds) durch die einmalige Orbit-Animation.
	export let orbitSignal: number | null = null;

	let isDragging = false;
	let showAiBadge = false;
	let aiBadgeTimer: ReturnType<typeof setTimeout> | null = null;
	let lastOrbitSignal: number | null = null;

	$: if (orbitSignal !== null && orbitSignal !== lastOrbitSignal) {
		lastOrbitSignal = orbitSignal;
		showAiBadge = true;
		if (aiBadgeTimer) clearTimeout(aiBadgeTimer);
		aiBadgeTimer = setTimeout(() => { showAiBadge = false; }, 5000);
	}

	$: assigneeInitials = ticket.assignee ? initials(ticket.assignee) : null;

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
	class="ticket-card relative min-h-[72px] flex flex-col px-3 py-2.5 rounded-lg border cursor-pointer select-none"
	class:is-dragging={isDragging}
	style="background: {isDragging ? 'var(--card-bg-hover)' : 'var(--card-bg)'}; border-color: {isDragging ? 'var(--primary)' : 'var(--edge)'}; box-shadow: {isDragging ? 'var(--elevation-2)' : 'none'}; opacity: {isDragging ? 0.5 : 1}; transition: border-color var(--duration-fast) var(--ease-soft), box-shadow var(--duration-fast) var(--ease-soft), background-color var(--duration-fast) var(--ease-soft), transform var(--duration-fast) var(--ease-soft), opacity var(--duration-fast) var(--ease-soft);{isDragging ? ' transform: rotate(1.5deg) scale(1.02);' : ''}"
>
	<OrbitHighlight signal={orbitSignal} radius="0.5rem" />
	{#if showAiBadge}
		<div class="ai-badge absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
			style="background: var(--color-surface); border: 1px solid var(--primary); color: var(--primary);"
			title="Von der KI aktualisiert"
			transition:fade={{ duration: 200 }}>
			<Sparkles class="w-3 h-3" />
		</div>
	{/if}
	<p class="text-sm font-medium leading-snug mb-1.5" style="color: var(--text);">
		{#if ticket.type === 'epic'}<span class="inline-flex items-center gap-1 mr-1.5 text-xs font-semibold align-middle" style="color: var(--color-warning);"><Flag class="w-3 h-3" /> Epic</span>{/if}{ticket.title}
	</p>
	{#if ticket.type === 'epic' && (ticket.epic_children_total ?? 0) > 0}
		<div class="flex items-center gap-1.5 mb-1.5" title="{ticket.epic_children_done}/{ticket.epic_children_total} Kind-Tickets erledigt">
			<div class="flex-1 h-1 rounded-full overflow-hidden" style="background: var(--edge);">
				<div
					class="h-full rounded-full"
					style="width: {Math.round((100 * (ticket.epic_children_done ?? 0)) / ticket.epic_children_total!)}%; background: var(--color-warning);"
				></div>
			</div>
			<span class="text-xs shrink-0 font-mono" style="color: var(--text-muted);">{ticket.epic_children_done}/{ticket.epic_children_total}</span>
		</div>
	{/if}
	<div class="mt-auto flex items-center justify-between gap-2">
		<div class="flex items-center gap-1.5 min-w-0">
			<span class="text-xs font-mono shrink-0" style="color: var(--text-muted);">#{ticket.id}</span>
			{#if ticket.model}
				<span class="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate max-w-[100px]"
					style="background: var(--color-surface-hover); color: var(--color-text-secondary);"
					title={ticket.model}>
					<Bot class="w-2.5 h-2.5 shrink-0" />
					{ticket.model.split('-').slice(0, 2).join('-')}
				</span>
			{/if}
			{#if ticket.docs_required && !(ticket.linked_notes_count ?? 0)}
				<span class="shrink-0" title="Doku-Pflicht: keine Knowledge-Base-Note verlinkt — Ticket kann so nicht geschlossen werden">
					<AlertTriangle class="w-3 h-3" style="color: var(--color-warning);" />
				</span>
			{:else if (ticket.linked_notes_count ?? 0) > 0}
				<span class="shrink-0" title="{ticket.linked_notes_count} Knowledge-Base-Note{(ticket.linked_notes_count ?? 0) !== 1 ? 's' : ''} verlinkt">
					<BookOpen class="w-3 h-3" style="color: var(--color-text-secondary);" />
				</span>
			{/if}
		</div>
		{#if assigneeInitials}
			<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
				style="background: var(--color-surface-hover); color: var(--color-text-secondary);"
				title={ticket.assignee || ''}>
				{assigneeInitials}
			</div>
		{/if}
	</div>
</div>

<style>
	/* !important nötig: Ruhe-Zustand (bg/border) liegt als Inline-Style an,
	   damit der Drag-Zustand reaktiv umschalten kann. */
	.ticket-card:hover:not(.is-dragging) {
		background: var(--card-bg-hover) !important;
		border-color: var(--edge-strong) !important;
	}
</style>
