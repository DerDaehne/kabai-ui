<script lang="ts">
	// Ticket #529: Custom-Node für canvas_elements.type = 'image'. Zeigt die
	// über /api/attachments/{id} ausgelieferten Bild-Bytes direkt als <img>
	// (object-fit: contain, füllt die per NodeResizer veränderbare Node-
	// Fläche — Resize-Pattern 1:1 wie TextNode/FrameNode). Ist das referenzierte
	// Attachment gelöscht (defensiver Fall, content->>'attachment_id' hat
	// bewusst keine FK, siehe V13-Kommentar), degradiert die Karte zu einer
	// gedämpften "Bild nicht gefunden"-Karte (Vorbild: RefNode) statt das
	// Browser-Broken-Image-Icon zu zeigen oder abzustürzen.
	//
	// description ist das Alt-Text-Feld für Text-Agenten (Konzept-Entscheidung
	// 8, V12-Kommentar) — fehlt es, zeigt die Karte ein sichtbares
	// Warn-Badge. Editieren folgt exakt dem isEditing/confirmEdit/cancelEdit-
	// Pattern aus FrameNode (dort für den Frame-Titel), hier für description.
	import { NodeResizer, Handle, Position } from '@xyflow/svelte';
	import { ImageOff, Pencil, Check, X, EyeOff } from 'lucide-svelte';

	export let id: string;
	export let data: {
		attachment_id: number;
		description: string | null;
		onDescriptionCommit: (id: string, description: string) => void;
		onResizeEnd: (id: string, width: number, height: number) => void;
	};
	export let selected = false;
	export let width: number | undefined = undefined;
	export let height: number | undefined = undefined;

	let imageFailed = false;

	let isEditing = false;
	let descriptionValue = '';
	let descriptionInputEl: HTMLTextAreaElement;

	function startEdit() {
		descriptionValue = data.description ?? '';
		isEditing = true;
		queueMicrotask(() => descriptionInputEl?.focus());
	}

	function cancelEdit() {
		isEditing = false;
	}

	function confirmEdit() {
		const trimmed = descriptionValue.trim();
		isEditing = false;
		if (trimmed !== (data.description ?? '')) {
			data.onDescriptionCommit(id, trimmed);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
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

<NodeResizer nodeId={id} minWidth={80} minHeight={60} isVisible={selected} onResizeEnd={handleResizeEnd} />

<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />

<div class="image-node" style={width && height ? `width: ${width}px; height: ${height}px;` : undefined}>
	{#if imageFailed}
		<div class="image-node__missing">
			<ImageOff class="w-6 h-6" style="color: var(--color-text-secondary);" />
			<span class="image-node__hint">Bild nicht gefunden</span>
		</div>
	{:else}
		<img
			src="/api/attachments/{data.attachment_id}"
			alt={data.description || ''}
			class="image-node__img"
			onerror={() => (imageFailed = true)}
		/>
	{/if}

	{#if !data.description}
		<div class="image-node__badge nodrag" title="Keine Beschreibung — für Text-Agenten unsichtbar">
			<EyeOff class="w-3.5 h-3.5" />
		</div>
	{/if}

	<div class="image-node__desc-bar nodrag">
		{#if isEditing}
			<textarea
				bind:this={descriptionInputEl}
				bind:value={descriptionValue}
				onkeydown={handleKeydown}
				class="image-node__desc-input"
				placeholder="Beschreibung (Alt-Text) eingeben…"
				aria-label="Bildbeschreibung"
			></textarea>
			<button type="button" class="image-node__icon-btn" onclick={confirmEdit} title="Übernehmen">
				<Check class="w-3.5 h-3.5" style="color: var(--color-success);" />
			</button>
			<button type="button" class="image-node__icon-btn" onclick={cancelEdit} title="Abbrechen">
				<X class="w-3.5 h-3.5" />
			</button>
		{:else}
			<span class="image-node__desc-text" title={data.description || ''}>
				{data.description || 'Keine Beschreibung'}
			</span>
			<button type="button" class="image-node__icon-btn" onclick={startEdit} title="Beschreibung bearbeiten">
				<Pencil class="w-3.5 h-3.5" />
			</button>
		{/if}
	</div>
</div>

<style>
	.image-node {
		width: 100%;
		height: 100%;
		min-width: 80px;
		min-height: 60px;
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border: 1px solid var(--edge-strong);
		border-radius: var(--radius-card, 8px);
		box-sizing: border-box;
		overflow: hidden;
		position: relative;
	}

	.image-node__img {
		flex: 1;
		width: 100%;
		min-height: 0;
		object-fit: contain;
		background: var(--color-bg);
	}

	.image-node__missing {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: color-mix(in srgb, var(--color-surface) 55%, transparent);
		border: 1.5px dashed var(--edge-strong);
	}

	.image-node__hint {
		font-size: 12px;
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.image-node__badge {
		position: absolute;
		top: 6px;
		right: 6px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--color-warning) 20%, var(--color-surface));
		color: var(--color-warning);
		border: 1px solid var(--color-warning);
	}

	.image-node__desc-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-top: 1px solid var(--edge-strong);
		flex-shrink: 0;
	}

	.image-node__desc-text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		color: var(--color-text-secondary);
	}

	.image-node__desc-input {
		flex: 1;
		min-width: 0;
		resize: none;
		font-size: 12px;
		font-family: inherit;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--edge-strong);
		border-radius: 4px;
		padding: 2px 6px;
		height: 22px;
		field-sizing: content;
		max-height: 80px;
	}

	.image-node__icon-btn {
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

	.image-node__icon-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}
</style>
