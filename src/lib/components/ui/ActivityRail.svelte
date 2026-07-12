<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Plus, Pencil, Trash2, Activity } from 'lucide-svelte';
	import { aiEvents, sseConnected, type AiEvent, type AiEventOp } from '$lib/stores/aiActivity';
	import { openTicketRequest } from '$lib/stores/ui';

	// Rendert höchstens die letzten 10 Events — kein Scroll-Archiv nötig
	// (aiEvents selbst ist bereits neueste zuerst, Ring-Puffer 50).
	$: visibleEvents = $aiEvents.slice(0, 10);

	// Ticks alle 30s, um die relativen Zeitstempel ("vor N min") aktuell zu halten.
	let now = Date.now();
	let intervalId: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		intervalId = setInterval(() => { now = Date.now(); }, 30000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	function relativeTime(timestamp: Date, _now: number): string {
		const diffMs = _now - timestamp.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'gerade eben';
		if (diffMin < 60) return `vor ${diffMin} min`;
		const diffH = Math.floor(diffMin / 60);
		return `vor ${diffH} h`;
	}

	function opIcon(op: AiEventOp) {
		if (op === 'INSERT') return Plus;
		if (op === 'UPDATE') return Pencil;
		if (op === 'DELETE') return Trash2;
		return Activity;
	}

	function opLabel(op: AiEventOp): string {
		if (op === 'INSERT') return 'erstellt';
		if (op === 'UPDATE') return 'aktualisiert';
		if (op === 'DELETE') return 'gelöscht';
		return 'geändert';
	}

	function onEntryClick(event: AiEvent) {
		if ($page.url.pathname.startsWith('/projects/')) {
			openTicketRequest.set(event.ticket_id);
		} else {
			goto(`/tickets/${event.ticket_id}`);
		}
	}
</script>

<div class="flex items-center justify-between mb-3">
	<h2 class="h3">AI-Aktivität</h2>
	<div class="flex items-center gap-1.5" title={$sseConnected ? 'Verbunden' : 'Getrennt'}>
		<span
			class="rail-status-dot"
			class:rail-status-dot--live={$sseConnected}
			style="background: {$sseConnected ? 'var(--color-success)' : 'var(--color-text-secondary)'};"
		></span>
		<span class="text-small" style="color: var(--color-text-secondary);">
			{$sseConnected ? 'Live' : 'Getrennt'}
		</span>
	</div>
</div>

{#if visibleEvents.length === 0}
	<p class="text-small" style="color: var(--color-text-secondary);">
		Noch keine KI-Aktivität in dieser Session. Ereignisse laufen ein, solange ein Projekt-Board oder eine Ticket-Seite geöffnet ist.
	</p>
{:else}
	<ul aria-live="polite" class="space-y-1" style="list-style: none; padding: 0; margin: 0;">
		{#each visibleEvents as event (event.id)}
			<li>
				<button
					type="button"
					onclick={() => onEntryClick(event)}
					class="flex items-center gap-2 w-full text-left rounded-md focus-visible:outline focus-visible:outline-2"
					style="padding: var(--space-2); background: transparent; border: none; cursor: pointer; outline-color: var(--color-primary);"
					onmouseenter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
					onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; }}
				>
					<svelte:component this={opIcon(event.op)} class="w-4 h-4 shrink-0" style="color: var(--color-text-secondary);" />
					<span class="text-small flex-1 min-w-0 truncate" style="color: var(--color-text);">
						#{event.ticket_id} {opLabel(event.op)}
					</span>
					<span class="text-caption shrink-0" style="color: var(--color-text-secondary);">
						{relativeTime(event.timestamp, now)}
					</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.rail-status-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 999px;
	}

	.rail-status-dot--live {
		animation: rail-status-pulse 2s ease-in-out infinite;
	}

	@keyframes rail-status-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	@media (prefers-reduced-motion: reduce) {
		.rail-status-dot--live {
			animation: none;
		}
	}
</style>
