<script lang="ts">
	// Ticket #527: Custom-Node für canvas_elements.type = 'text'. Textarea ohne
	// sichtbaren Rand (nur dezenter Fokus-Ring), Auto-Grow per CSS
	// field-sizing (mit JS-Fallback für Browser ohne Unterstützung, z.B.
	// aktuelles Firefox/WebKit), Speichern per PATCH on:blur (Design-
	// Entscheidung 3). Resize über den offiziellen NodeResizer-Export von
	// @xyflow/svelte 0.1.39 — der existiert entgegen der Ticket-Annahme
	// bereits (kein manueller Pointer-Handle nötig).
	import { NodeResizer, Handle, Position } from '@xyflow/svelte';

	export let id: string;
	export let data: {
		text: string;
		onTextCommit: (id: string, text: string) => void;
		onResizeEnd: (id: string, width: number, height: number) => void;
	};
	export let selected = false;
	export let width: number | undefined = undefined;
	export let height: number | undefined = undefined;

	let value = data.text ?? '';
	let textareaEl: HTMLTextAreaElement;

	// data.text kann sich von außen ändern (z.B. nach Reload/Refetch) — lokalen
	// Editier-Stand nur übernehmen, wenn er nicht gerade fokussiert bearbeitet wird.
	$: if (document?.activeElement !== textareaEl) {
		value = data.text ?? '';
	}

	function autoGrow() {
		if (!textareaEl) return;
		// JS-Fallback für Browser ohne `field-sizing: content` — no-op dort,
		// weil scrollHeight dann bereits durch CSS korrekt bestimmt ist.
		textareaEl.style.height = 'auto';
		textareaEl.style.height = `${textareaEl.scrollHeight}px`;
	}

	function handleBlur() {
		data.onTextCommit(id, value);
	}

	function handleResizeEnd(_event: unknown, params: { width: number; height: number }) {
		data.onResizeEnd(id, params.width, params.height);
	}
</script>

<NodeResizer nodeId={id} minWidth={120} minHeight={60} isVisible={selected} onResizeEnd={handleResizeEnd} />

<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />

<div class="text-node" style={width && height ? `width: ${width}px; height: ${height}px;` : undefined}>
	<textarea
		bind:this={textareaEl}
		bind:value
		oninput={autoGrow}
		onblur={handleBlur}
		placeholder="Text eingeben…"
		class="text-node__textarea nodrag"
	></textarea>
</div>

<style>
	.text-node {
		width: 100%;
		height: 100%;
		min-width: 120px;
		min-height: 60px;
		background: var(--color-surface);
		border: 1px solid var(--edge-strong);
		border-radius: var(--radius-card, 8px);
		padding: 10px 12px;
		box-sizing: border-box;
	}

	.text-node__textarea {
		width: 100%;
		height: 100%;
		resize: none;
		border: none;
		outline: none;
		background: transparent;
		color: var(--color-text);
		font: inherit;
		font-size: 13px;
		line-height: 1.4;
		field-sizing: content;
	}

	.text-node__textarea:focus {
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 45%, transparent);
		border-radius: 4px;
	}
</style>
