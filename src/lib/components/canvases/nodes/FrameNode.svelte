<script lang="ts">
	// Ticket #527: Custom-Node für canvas_elements.type = 'frame'. Größerer,
	// halbtransparenter Rahmen; Titel per Klick/Edit-Icon inline editierbar
	// (Rename-Pattern nach Vorbild CanvasCard.svelte: eigener Edit-Zustand,
	// Enter bestätigt, Escape bricht ab, Blur committet). Niedrigerer zIndex
	// als TextNode wird beim Node-Objekt selbst gesetzt (CanvasEditor), nicht
	// hier in der Komponente.
	import { NodeResizer, Handle, Position } from '@xyflow/svelte';
	import { Pencil, Check, X } from 'lucide-svelte';

	export let id: string;
	export let data: {
		title: string;
		onTitleCommit: (id: string, title: string) => void;
		onResizeEnd: (id: string, width: number, height: number) => void;
	};
	export let selected = false;
	export let width: number | undefined = undefined;
	export let height: number | undefined = undefined;

	let isEditing = false;
	let titleValue = '';
	let titleInputEl: HTMLInputElement;

	function startEdit() {
		titleValue = data.title ?? '';
		isEditing = true;
		queueMicrotask(() => titleInputEl?.focus());
	}

	function cancelEdit() {
		isEditing = false;
	}

	function confirmEdit() {
		const trimmed = titleValue.trim();
		isEditing = false;
		if (trimmed && trimmed !== data.title) {
			data.onTitleCommit(id, trimmed);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			confirmEdit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEdit();
		}
	}

	function handleResizeEnd(_event: unknown, params: { width: number; height: number }) {
		data.onResizeEnd(id, params.width, params.height);
	}
</script>

<NodeResizer nodeId={id} minWidth={200} minHeight={150} isVisible={selected} onResizeEnd={handleResizeEnd} />

<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />

<div class="frame-node" style={width && height ? `width: ${width}px; height: ${height}px;` : undefined}>
	<div class="frame-node__header nodrag">
		{#if isEditing}
			<input
				bind:this={titleInputEl}
				type="text"
				bind:value={titleValue}
				onkeydown={handleKeydown}
				class="frame-node__title-input"
				aria-label="Frame-Titel"
			/>
			<button type="button" class="frame-node__icon-btn" onclick={confirmEdit} title="Übernehmen">
				<Check class="w-3.5 h-3.5" style="color: var(--color-success);" />
			</button>
			<button type="button" class="frame-node__icon-btn" onclick={cancelEdit} title="Abbrechen">
				<X class="w-3.5 h-3.5" />
			</button>
		{:else}
			<span class="frame-node__title" title={data.title}>{data.title || 'Frame'}</span>
			<button type="button" class="frame-node__icon-btn" onclick={startEdit} title="Titel bearbeiten">
				<Pencil class="w-3.5 h-3.5" />
			</button>
		{/if}
	</div>
	<div class="frame-node__body"></div>
</div>

<style>
	.frame-node {
		width: 100%;
		height: 100%;
		min-width: 200px;
		min-height: 150px;
		background: color-mix(in srgb, var(--color-surface) 55%, transparent);
		border: 1.5px dashed var(--edge-strong);
		border-radius: var(--radius-card, 10px);
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}

	.frame-node__header {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-bottom: 1px dashed var(--edge-strong);
	}

	.frame-node__title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.frame-node__title-input {
		flex: 1;
		min-width: 0;
		font-size: 12px;
		font-weight: 600;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--edge-strong);
		border-radius: 4px;
		padding: 2px 6px;
	}

	.frame-node__icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		color: var(--color-text-secondary);
		background: transparent;
		border-radius: 4px;
	}

	.frame-node__icon-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.frame-node__body {
		flex: 1;
	}
</style>
