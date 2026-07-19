<script lang="ts">
	// Ticket #527, Design-Entscheidung 6: Kanten-Label per Doppelklick auf die
	// Kante editierbar. @xyflow/svelte 0.1.39 hat kein "edgedoubleclick"-Event
	// wie es Nodes ("nodedragstart" etc.) haben — daher ein eigener Edge-Typ
	// mit BaseEdge (Pfad-Rendering) + EdgeLabelRenderer (HTML-Overlay fürs
	// Label, per Handle-Position umgerechnet ins Viewport-Koordinatensystem;
	// beides existiert in dieser Version).
	import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/svelte';
	import type { EdgeProps } from '@xyflow/svelte';

	type $$Props = EdgeProps & {
		data?: {
			label?: string | null;
			onLabelCommit: (id: string, label: string) => void;
		};
	};

	export let id: string;
	export let sourceX: number;
	export let sourceY: number;
	export let targetX: number;
	export let targetY: number;
	export let sourcePosition: any;
	export let targetPosition: any;
	export let markerEnd: string | undefined = undefined;
	export let style: string | undefined = undefined;
	export let data: $$Props['data'] = undefined;
	export let selected = false;

	$: [path, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition
	});

	let isEditing = false;
	let labelValue = '';
	let inputEl: HTMLInputElement;

	function startEdit() {
		labelValue = data?.label ?? '';
		isEditing = true;
		queueMicrotask(() => inputEl?.focus());
	}

	function commit() {
		isEditing = false;
		const trimmed = labelValue.trim();
		if (trimmed !== (data?.label ?? '')) {
			data?.onLabelCommit(id, trimmed);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			isEditing = false;
		}
	}
</script>

<BaseEdge {id} {path} {markerEnd} style={`${style ?? ''} ${selected ? 'stroke: var(--color-primary);' : ''}`} />

<EdgeLabelRenderer>
	<div
		class="labeled-edge__label nodrag nopan"
		style={`transform: translate(-50%, -50%) translate(${labelX}px, ${labelY}px);`}
		ondblclick={startEdit}
		role="button"
		tabindex="0"
	>
		{#if isEditing}
			<input
				bind:this={inputEl}
				type="text"
				bind:value={labelValue}
				onblur={commit}
				onkeydown={handleKeydown}
				class="labeled-edge__input"
				placeholder="Label…"
			/>
		{:else if data?.label}
			<span class="labeled-edge__text">{data.label}</span>
		{:else}
			<span class="labeled-edge__placeholder">+ Label</span>
		{/if}
	</div>
</EdgeLabelRenderer>

<style>
	.labeled-edge__label {
		position: absolute;
		pointer-events: all;
		font-size: 11px;
		cursor: pointer;
		/* xyflow elevates a selected node to z-index 1000 (elevateNodesOnSelect,
		   not configurable in 0.1.x) and .svelte-flow__edgelabel-renderer itself
		   carries no z-index — without this, a selected node right under a short
		   edge (e.g. text dragged into a frame) can cover the label and block
		   the double-click. 1001 matches xyflow's own convention for content
		   that must stay above elevated nodes (svg.svelte-flow__connectionline). */
		z-index: 1001;
	}

	.labeled-edge__text {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--edge-strong);
		border-radius: 4px;
		padding: 1px 6px;
	}

	.labeled-edge__placeholder {
		background: transparent;
		color: var(--color-text-secondary);
		opacity: 0;
		border-radius: 4px;
		padding: 1px 6px;
		transition: opacity var(--duration-fast, 120ms) ease;
	}

	.labeled-edge__label:hover .labeled-edge__placeholder {
		opacity: 0.8;
		background: var(--color-surface);
		border: 1px dashed var(--edge-strong);
	}

	.labeled-edge__input {
		font-size: 11px;
		padding: 1px 6px;
		border-radius: 4px;
		border: 1px solid var(--color-primary);
		background: var(--color-surface);
		color: var(--color-text);
		width: 100px;
	}
</style>
