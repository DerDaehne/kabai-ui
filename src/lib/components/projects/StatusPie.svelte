<script lang="ts">
	import type { ProjectOverviewStatus } from '$lib/types';

	// Tortendiagramm: Ticket-Anzahl je Board-Status, Reihenfolge nach Status-Position.
	// Farbverlauf: erster Status Grau, letzter Status Grün, dazwischen linear
	// interpoliert (Grau → Grün), passend zum Dark Theme abgetönt.
	export let statuses: ProjectOverviewStatus[] = [];
	export let size = 80;

	const GREY = { r: 0x6b, g: 0x72, b: 0x80 }; // #6b7280
	const GREEN = { r: 0x34, g: 0xd3, b: 0x99 }; // #34d399

	function lerpColor(t: number): string {
		const r = Math.round(GREY.r + (GREEN.r - GREY.r) * t);
		const g = Math.round(GREY.g + (GREEN.g - GREY.g) * t);
		const b = Math.round(GREY.b + (GREEN.b - GREY.b) * t);
		return `rgb(${r}, ${g}, ${b})`;
	}

	// Sonderstatus (human_intervention/human_answered) fließen nicht ins Diagramm ein
	$: visibleStatuses = statuses
		.filter((s) => s.special_type !== 'human_intervention' && s.special_type !== 'human_answered')
		.slice()
		.sort((a, b) => a.position - b.position);

	$: total = visibleStatuses.reduce((sum, s) => sum + s.ticket_count, 0);

	// Segmente als SVG-Kreisbögen (Radius r, Zentrum cx/cy) via stroke-dasharray
	const strokeWidth = 0.2; // relativ zum viewBox (0..1 Koordinatensystem, r=0.4)
	const r = 0.36;
	const circumference = 2 * Math.PI * r;

	$: segments = (() => {
		if (total === 0 || visibleStatuses.length === 0) return [];
		let offset = 0;
		const n = visibleStatuses.length;
		return visibleStatuses.map((s, i) => {
			const fraction = s.ticket_count / total;
			const dash = fraction * circumference;
			const color = lerpColor(n > 1 ? i / (n - 1) : 1);
			const seg = { color, dash, offset, label: `${s.display_name}: ${s.ticket_count}`, count: s.ticket_count };
			offset += dash;
			return seg;
		}).filter((s) => s.count > 0);
	})();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 1 1"
	role="img"
	aria-label={total > 0 ? `${total} Ticket${total !== 1 ? 's' : ''} verteilt auf ${visibleStatuses.length} Status${visibleStatuses.length !== 1 ? 'se' : ''}` : 'Keine Tickets'}
>
	{#if total === 0}
		<circle
			cx="0.5" cy="0.5" r={r}
			fill="none"
			stroke="var(--edge)"
			stroke-width={strokeWidth}
		>
			<title>Keine Tickets</title>
		</circle>
	{:else}
		<g transform="rotate(-90 0.5 0.5)">
			{#each segments as seg (seg.offset)}
				<circle
					cx="0.5" cy="0.5" r={r}
					fill="none"
					stroke={seg.color}
					stroke-width={strokeWidth}
					stroke-dasharray="{seg.dash} {circumference - seg.dash}"
					stroke-dashoffset={-seg.offset}
				>
					<title>{seg.label}</title>
				</circle>
			{/each}
		</g>
	{/if}
</svg>
