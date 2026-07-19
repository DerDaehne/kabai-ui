<script lang="ts">
	// Ticket #528: Custom-Node für canvas_elements.type = 'ref' — eine Karte,
	// die ein bestehendes Ticket/Epic/eine Note auf den Canvas holt (keine
	// Kopie der Daten, nur target_type/target_id werden persistiert). Beim
	// Mount wird der aktuelle Stand über /api/refs/{type}/{id} nachgeladen,
	// damit die Karte immer den Live-Titel/-Status zeigt statt eines
	// veralteten Snapshots. Existiert das Ziel nicht mehr (gelöscht), wird
	// eine gedämpfte "nicht gefunden"-Karte gerendert (Vorbild: FrameNode
	// dashed-border-Styling) statt die Komponente abstürzen zu lassen.
	// Kein NodeResizer — feste Default-Kartengröße, kein Resize in diesem Ticket.
	import { onMount } from 'svelte';
	import { Handle, Position } from '@xyflow/svelte';
	import { Flag, BookOpen, Compass, Link2Off } from 'lucide-svelte';
	import type { RefResolveResult } from '$lib/types';

	// id/selected sind Teil des von xyflow verdrahteten Node-Prop-Vertrags
	// (gleiche Signatur wie TextNode/FrameNode), werden hier aber nicht
	// gebraucht: kein NodeResizer (also kein id-Bezug) und kein optischer
	// Selected-Zustand — export const statt export let macht das für Linter/
	// TS explizit ("nur für externe Referenz"), ohne den Prop wegzulassen.
	export const id: string = '';
	export let data: {
		target_type: 'ticket' | 'note';
		target_id: number;
		onOpenTicket: (ticketId: number) => void;
	};
	export const selected = false;
	export let width: number | undefined = undefined;
	export let height: number | undefined = undefined;

	let resolved: RefResolveResult | null = null;
	let isLoading = true;

	async function resolveTarget() {
		isLoading = true;
		try {
			const res = await fetch(`/api/refs/${data.target_type}/${data.target_id}`);
			const result = await res.json();
			if (result.ok) {
				resolved = result.data;
			} else {
				// Serverfehler (nicht "Ziel existiert nicht", das kommt als ok:true
				// mit exists:false) — geloggt, aber die Karte degradiert trotzdem
				// nur zur Hinweis-Karte statt den gesamten Editor zu sprengen.
				console.error('RefNode: Auflösen fehlgeschlagen', result.error);
				resolved = { exists: false };
			}
		} catch (err) {
			console.error('RefNode: Netzwerkfehler beim Auflösen', err);
			resolved = { exists: false };
		} finally {
			isLoading = false;
		}
	}

	// data.target_type/target_id ändern sich zur Laufzeit nicht (ein Ref-Element
	// wechselt nie sein Ziel), daher reicht ein einmaliger Fetch bei Mount.
	onMount(resolveTarget);

	// WICHTIG: Die Karte trägt bewusst KEIN "nodrag" — anders als bei TextNode
	// (nodrag nur auf der Textarea) und FrameNode (nodrag nur auf dem Header)
	// füllt die Karte hier die komplette Node-Fläche; ein "nodrag" darauf
	// hätte die Node komplett undraggable gemacht (keine nodrag-freie Fläche
	// mehr übrig). Stattdessen unterscheidet ein Bewegungsschwellwert
	// zwischen pointerdown/click "echten Klick" von "Klick nach Drag" (xyflow
	// feuert click auch nach einem Pointer-Drag) — die Node bleibt normal
	// per Drag verschiebbar, nur ein Klick ohne nennenswerte Bewegung öffnet
	// das Ziel.
	let pointerDownPos: { x: number; y: number } | null = null;
	const DRAG_THRESHOLD_PX = 5;

	function handlePointerDown(e: PointerEvent) {
		pointerDownPos = { x: e.clientX, y: e.clientY };
	}

	function handleClick(e: MouseEvent) {
		if (pointerDownPos) {
			const dx = e.clientX - pointerDownPos.x;
			const dy = e.clientY - pointerDownPos.y;
			if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) return;
		}
		openTarget();
	}

	function openTarget() {
		if (!resolved || !resolved.exists) return;
		if (data.target_type === 'ticket') {
			data.onOpenTicket(data.target_id);
		} else if (resolved.exists && 'slug' in resolved) {
			window.open(`/notes/${resolved.slug}`, '_blank');
		}
	}
</script>

<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />

<div class="ref-node" style={width && height ? `width: ${width}px; height: ${height}px;` : undefined}>
	<div
		class="ref-node__card"
		class:ref-node__card--missing={!isLoading && (!resolved || !resolved.exists)}
		role="button"
		tabindex="0"
		onpointerdown={handlePointerDown}
		onclick={handleClick}
		onkeydown={(e) => e.key === 'Enter' && openTarget()}
	>
		{#if isLoading}
			<span class="ref-node__hint">Lade Referenz…</span>
		{:else if !resolved || !resolved.exists}
			<div class="ref-node__row">
				<Link2Off class="w-4 h-4 shrink-0" style="color: var(--color-text-secondary);" />
				<span class="ref-node__hint">Referenz nicht gefunden</span>
			</div>
		{:else if data.target_type === 'ticket' && 'status_name' in resolved}
			<div class="ref-node__row">
				{#if resolved.type === 'epic'}
					<Flag class="w-4 h-4 shrink-0" style="color: var(--color-warning);" />
				{:else}
					<span class="ref-node__ticket-dot" aria-hidden="true"></span>
				{/if}
				<span class="ref-node__title truncate" title={resolved.title}>{resolved.title}</span>
			</div>
			<div class="ref-node__badges">
				<span class="badge-primary">{resolved.project_name}</span>
				<span class="status-chip" style="--chip-color: var(--color-primary);">{resolved.status_name}</span>
			</div>
		{:else if 'kind' in resolved}
			<div class="ref-node__row">
				{#if resolved.kind === 'hub'}
					<Compass class="w-4 h-4 shrink-0" style="color: var(--color-warning);" />
				{:else}
					<BookOpen class="w-4 h-4 shrink-0" style="color: {resolved.kind === 'adr' ? 'var(--color-secondary)' : 'var(--color-primary)'};" />
				{/if}
				<span class="ref-node__title truncate" title={resolved.title}>{resolved.title}</span>
			</div>
			<div class="ref-node__badges">
				{#each resolved.project_names as name}
					<span class="badge-primary">{name}</span>
				{/each}
				<span class="status-chip" style="--chip-color: var(--color-text-secondary);">
					{resolved.kind === 'hub' ? 'Hub' : resolved.kind === 'adr' ? 'ADR' : 'Note'}
				</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.ref-node {
		width: 100%;
		height: 100%;
		min-width: 180px;
		min-height: 70px;
		box-sizing: border-box;
	}

	.ref-node__card {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 6px;
		padding: 10px 12px;
		box-sizing: border-box;
		background: var(--color-surface);
		border: 1px solid var(--edge-strong);
		border-radius: var(--radius-card, 8px);
		cursor: pointer;
		text-align: left;
	}

	.ref-node__card:hover {
		background: var(--color-surface-hover);
	}

	.ref-node__card--missing {
		background: color-mix(in srgb, var(--color-surface) 55%, transparent);
		border: 1.5px dashed var(--edge-strong);
		cursor: default;
	}

	.ref-node__card--missing:hover {
		background: color-mix(in srgb, var(--color-surface) 55%, transparent);
	}

	.ref-node__row {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.ref-node__title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
		min-width: 0;
	}

	.ref-node__hint {
		font-size: 12px;
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.ref-node__badges {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.ref-node__ticket-dot {
		width: 6px;
		height: 6px;
		border-radius: 9999px;
		background: var(--color-text-secondary);
		flex-shrink: 0;
		margin: 0 5px;
	}
</style>
