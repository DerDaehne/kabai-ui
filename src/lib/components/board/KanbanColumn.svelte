<script lang="ts">
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { Plus, Pencil } from 'lucide-svelte';
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
	// Map ticket_id -> Zähler/Timestamp des letzten KI-Events (siehe aiActivity.ts).
	// Treibt die einmalige Orbit-Animation auf der jeweiligen TicketCard.
	export let orbitSignals: Map<number, number> = new Map();

	// Gedämpfte Spalten-Akzente — nur noch für den kleinen Orientierungspunkt im
	// Header verwendet (Theme v3: Farbe trägt Bedeutung, keine Regenbogen-Codierung
	// mehr für Chips/Hover/Drag-Feedback — die laufen jetzt einheitlich über Primary).
	const accentColors = [
		{ border: '#6e7bf2' },
		{ border: '#8b5cf6' },
		{ border: '#3da06b' },
		{ border: '#c98a2d' },
		{ border: '#c25252' },
	];
	$: accent = accentColors[colorIndex % accentColors.length];

	let isDragOver = false;

	// Gerendert wird höhenbasiert statt mit fester Seitengröße: initial so
	// viele Tickets, wie in die (auf Viewport-Höhe gedeckelte) Spalte passen,
	// beim Scrollen ans Listenende lädt die Spalte automatisch nach.
	const CARD_ESTIMATE = 96; // min-h 92px + gap
	const LOAD_CHUNK = 25;
	let zoneHeight = 0;
	let extraCount = 0;

	$: visibleCount = Math.max(10, Math.ceil((zoneHeight || 600) / CARD_ESTIMATE) + 3) + extraCount;

	$: sortedTickets = [...tickets].sort((a, b) =>
		new Date(b.updated_at || b.created_at).getTime() -
		new Date(a.updated_at || a.created_at).getTime()
	);
	$: displayedTickets = sortedTickets.slice(0, visibleCount);
	$: hiddenCount = sortedTickets.length - displayedTickets.length;

	function handleZoneScroll(e: Event) {
		const el = e.currentTarget as HTMLElement;
		if (hiddenCount > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
			extraCount += LOAD_CHUNK;
		}
	}

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
     Spalten gleich hoch sind und ihre Drop-Zone (flex-1) mitwächst (#18).
     max-h koppelt die Spalte an die Viewport-Höhe (Abzug für Nav-/Header-
     Bereich); längere Listen scrollen in der Drop-Zone statt die Seite zu
     verlängern. -->
<div class="flex flex-col h-full max-h-[calc(100vh-14rem)] rounded-xl overflow-hidden"
	style="border: 1px solid {isDragOver ? 'var(--color-primary)' : 'transparent'}; box-shadow: var(--elevation-1), var(--highlight-top); background: var(--card-bg); transition: border-color var(--duration-fast) var(--ease-soft), box-shadow var(--duration-fast) var(--ease-soft);"
>
	<!-- Column Header -->
	<div
		class="px-4 py-3 flex items-center justify-between gap-2"
		style="background: var(--color-surface-hover);"
	>
		<div class="flex items-center gap-2 min-w-0">
			<div class="w-2 h-2 rounded-full shrink-0" style="background: {accent.border};"></div>
			<span class="font-semibold truncate text-sm" style="color: var(--text);">{status.display_name}</span>
			<span
				class="status-chip shrink-0"
				style="--chip-color: var(--color-text-secondary);"
			>{tickets.length}</span>
		</div>
		<div class="flex items-center gap-1 shrink-0">
			<button
				onclick={onOpenStatuses}
				class="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200"
				style="color: var(--text-muted);"
				onmouseenter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-text)'; }}
				onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
				title="Status bearbeiten"
			>
				<Pencil class="w-3 h-3" />
			</button>
			<button
				onclick={onNewTicket}
				class="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200"
				style="color: var(--text-muted);"
				onmouseenter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-text)'; }}
				onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
				title="Neues Ticket"
			>
				<Plus class="w-3.5 h-3.5" />
			</button>
		</div>
	</div>
	<div class="hairline"></div>

	<!-- Drop Zone Body: scrollt innerhalb der (viewport-gedeckelten) Spalte;
	     Scroll ans Ende lädt automatisch weitere Tickets nach -->
	<div
		class="flex-1 p-2 space-y-2 min-h-[160px] overflow-y-auto transition-all duration-200"
		style="background: {isDragOver ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'transparent'};"
		bind:clientHeight={zoneHeight}
		onscroll={handleZoneScroll}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	>
		{#if sortedTickets.length === 0}
			<div
				class="flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed text-xs transition-all duration-200"
				style="border-color: {isDragOver ? 'var(--color-primary)' : 'var(--border)'}; color: var(--text-muted);"
			>
				{#if isDragOver}
					<div class="w-8 h-8 rounded-full flex items-center justify-center mb-2" style="background: color-mix(in srgb, var(--color-primary) 8%, transparent); color: var(--color-primary);">
						<Plus class="w-4 h-4" />
					</div>
					<span style="color: var(--color-primary);">Hier ablegen</span>
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
					<TicketCard {ticket} {projectId} {status} {onTicketClick} orbitSignal={orbitSignals.get(ticket.id) ?? null} />
				</div>
			{/each}
			{#if hiddenCount > 0}
				<div class="py-2 text-center text-xs" style="color: var(--text-muted);">
					{hiddenCount} weitere — scrollen lädt nach
				</div>
			{/if}
		{/if}
	</div>

	<!-- Footer -->
	<div class="hairline"></div>
	<button
		onclick={onNewTicket}
		class="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs transition-all duration-200"
		style="color: var(--text-muted);"
		onmouseenter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-text)'; }}
		onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
	>
		<Plus class="w-3.5 h-3.5" />
		Neues Ticket
	</button>
</div>
