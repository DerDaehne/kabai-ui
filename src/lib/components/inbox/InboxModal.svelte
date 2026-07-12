<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	import { Inbox, ArrowRight, Bot } from 'lucide-svelte';
	import OrbitHighlight from '$components/ui/OrbitHighlight.svelte';
	import type { Ticket } from '$lib/types';

	export let tickets: Ticket[] = [];
	export let onTicketClick: (ticketId: number) => void = () => {};
	export let onClose: () => void = () => {};
	// Map ticket_id -> Zähler/Timestamp des letzten KI-Events (siehe aiActivity.ts).
	export let orbitSignals: Map<number, number> = new Map();

	$: sorted = [...tickets].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
</script>

<div class="p-6 pr-14">
	<div class="flex items-center gap-2 mb-4">
		<Inbox class="w-5 h-5" style="color: var(--primary);" />
		<h2 class="text-lg font-bold" style="color: var(--text);">Inbox</h2>
		<span class="text-xs px-2 py-0.5 rounded-full font-medium"
			style="background: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--primary); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);">
			{tickets.length}
		</span>
	</div>
	<p class="text-sm mb-5" style="color: var(--text-muted);">
		Tickets, die von der KI zur menschlichen Prüfung übergeben wurden.
	</p>

	{#if sorted.length === 0}
		<div class="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed" style="border-color: var(--border);" in:fade={{ duration: 200 }}>
			<Inbox class="w-8 h-8 mb-3" style="color: var(--text-muted);" />
			<p class="text-sm" style="color: var(--text-muted);">Keine Tickets warten auf dich.</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each sorted as ticket, i (ticket.id)}
				<div animate:flip={{ duration: 250 }} in:fly={{ y: 8, duration: 250, delay: i * 30, easing: quintOut }}>
					<button
						onclick={() => onTicketClick(ticket.id)}
						class="relative w-full text-left p-3 rounded-xl card flex items-center justify-between gap-3"
					>
						<OrbitHighlight signal={orbitSignals.get(ticket.id) ?? null} radius="0.75rem" />
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-xs font-mono" style="color: var(--text-muted);">#{ticket.id}</span>
								{#if ticket.model}
									<span class="flex items-center gap-1 text-xs" style="color: var(--accent);">
										<Bot class="w-3 h-3" />{ticket.model.split('-').slice(0, 2).join('-')}
									</span>
								{/if}
							</div>
							<p class="text-sm font-medium truncate" style="color: var(--text);">{ticket.title}</p>
						</div>
						<ArrowRight class="w-4 h-4 shrink-0" style="color: var(--text-muted);" />
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
