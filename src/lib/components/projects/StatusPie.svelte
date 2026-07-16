<script lang="ts">
	import type { ProjectOverviewStatus } from '$lib/types';

	// Tortendiagramm: Ticket-Anzahl je Board-Status, Reihenfolge nach Status-Position.
	// Farbgebung: erster Status Grau (Backlog), letzter Status Grün (Done),
	// dazwischen kategoriale, klar unterscheidbare Hues statt linearer
	// Interpolation — Nachbarsegmente sollen nicht mehr ineinander verschmelzen.
	export let statuses: ProjectOverviewStatus[] = [];
	export let size = 80;

	const GREY = '#6b7280';
	const GREEN = '#34d399';

	// Zwischenstatus (weder erster noch letzter) bekommen der Reihe nach deutlich
	// getrennte Hues statt einer Grau-Grün-Interpolation. Bei mehr Zwischenstatus
	// als Farben wird die Palette zyklisch wiederverwendet.
	const MID_PALETTE = ['#60a5fa', '#f59e0b', '#a78bfa', '#f472b6', '#22d3ee'];

	// Ordnet einem Status anhand seiner Position in der sortierten Liste eine
	// feste, deterministische Farbe zu (gleicher Index = gleiche Farbe).
	function colorForIndex(i: number, n: number): string {
		if (n <= 1) return GREEN;
		if (i === 0) return GREY;
		if (i === n - 1) return GREEN;
		return MID_PALETTE[(i - 1) % MID_PALETTE.length];
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
			const color = colorForIndex(i, n);
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
