<script lang="ts">
	// Ticket #530: Custom-Node für canvas_elements.type = 'sketch'. Freihand-
	// Zeichnen direkt auf der Canvas-Fläche, Rendering über perfect-freehand
	// (getStroke() liefert ein Umriss-Polygon, siehe getSvgPathFromStroke()
	// unten — Standard-Snippet aus der perfect-freehand-Doku, 1:1 übernommen).
	//
	// Wichtige Design-Entscheidung: Striche werden NICHT beim Resize
	// umgerechnet — sie behalten ihre absoluten lokalen Pixelkoordinaten vom
	// Zeitpunkt des Zeichnens, Resize ändert nur den sichtbaren/geclippten
	// Bereich (overflow: hidden). Das hält die Koordinaten-Mathematik simpel
	// und ist für den Ticket-Scope ausreichend.
	//
	// Zwei umschaltbare Modi (Zeichnen/Radieren, gegenseitig exklusiv) plus ein
	// einmaliger Undo-Button, Header-Bar-Layout nach Vorbild FrameNode. Ist
	// KEIN Modus aktiv, verhält sich der Node wie jeder andere (draggable via
	// xyflow) — das SVG bekommt dann pointer-events: none, damit es Drag/Pan
	// nicht stört. Ist ein Modus aktiv, tragen SVG "nodrag nopan", damit xyflow
	// währenddessen weder den Node zieht noch die Canvas pannt.
	//
	// description ist das Alt-Text-Feld für Text-Agenten (dieselbe Konvention
	// wie bei ImageNode/#529) — fehlt es, zeigt die Karte dasselbe EyeOff-Badge,
	// 1:1 aus ImageNode übernommen statt neu erfunden.
	import { NodeResizer, Handle, Position } from '@xyflow/svelte';
	import { getStroke } from 'perfect-freehand';
	import { Pencil, Eraser, Undo2, Check, X, EyeOff } from 'lucide-svelte';

	type Stroke = [number, number, number][];
	type UndoEntry = { type: 'add' | 'remove'; stroke: Stroke; index: number };

	export let id: string;
	export let data: {
		strokes: Stroke[];
		description: string | null;
		onStrokesCommit: (id: string, strokes: Stroke[]) => void;
		onDescriptionCommit: (id: string, description: string) => void;
		onResizeEnd: (id: string, width: number, height: number) => void;
	};
	export let selected = false;
	export let width: number | undefined = undefined;
	export let height: number | undefined = undefined;

	const STROKE_OPTIONS = { size: 4, thinning: 0.5, smoothing: 0.5, streamline: 0.5 };
	// Etwas großzügiger als die sichtbare Strichbreite, da die rohen
	// Eingabepunkte spärlicher liegen als das gerenderte Umriss-Polygon.
	const ERASE_HIT_RADIUS = 12;
	const UNDO_STACK_LIMIT = 20;

	let strokes: Stroke[] = data.strokes ?? [];
	// data.strokes kann sich von außen ändern (Reload/Refetch) — nur
	// übernehmen, solange nicht gerade lokal gezeichnet/radiert wird.
	$: if (!drawMode && !eraseMode) {
		strokes = data.strokes ?? [];
	}

	let drawMode = false;
	let eraseMode = false;
	let undoStack: UndoEntry[] = [];

	let svgEl: SVGSVGElement;
	let currentStroke: Stroke | null = null;

	// BUGFIX (von David gemeldet): das SVG-Koordinatensystem darf sich NICHT
	// an der vollen Node-Breite/-Höhe (width/height-Props) orientieren — der
	// tatsächlich zeichenbare Bereich (.sketch-node__body) ist kleiner, weil
	// Header- und Beschreibungsleiste vertikal Platz wegnehmen (z.B. 220px
	// Node-Höhe -> nur ~148px Body-Höhe). viewBox="0 0 {width} {height}"
	// stimmte deshalb nicht mit der tatsächlichen Seitenverhältnis des Body-
	// Elements überein; der Browser hat mit dem SVG-Default preserveAspectRatio
	// ("xMidYMid meet") den Inhalt seitenverhältnis-treu skaliert UND zentriert
	// (Letterboxing) statt ihn 1:1 zu strecken — dadurch trafen Klicks nahe der
	// Mitte in etwa, wichen aber zu den Rändern hin immer weiter vom
	// tatsächlichen Zeichenpunkt ab. Fix: die ECHTE Größe von .sketch-node__body
	// per bind:clientWidth/clientHeight messen (zoom-unabhängig, da
	// clientWidth/Height NICHT von xyflows CSS-transform:scale() beeinflusst
	// werden, anders als getBoundingClientRect()) und für viewBox/width/height
	// UND für die localPoint()-Umrechnung verwenden — plus
	// preserveAspectRatio="none" als zusätzliche Absicherung, falls das
	// Seitenverhältnis durch Rundung minimal abweicht.
	let bodyClientWidth = 0;
	let bodyClientHeight = 0;
	$: svgWidth = bodyClientWidth || width || 300;
	$: svgHeight = bodyClientHeight || height || 220;

	function toggleDraw() {
		drawMode = !drawMode;
		if (drawMode) eraseMode = false;
	}

	function toggleErase() {
		eraseMode = !eraseMode;
		if (eraseMode) drawMode = false;
	}

	function localPoint(e: PointerEvent): [number, number] {
		const rect = svgEl.getBoundingClientRect();
		const localX = ((e.clientX - rect.left) * svgWidth) / rect.width;
		const localY = ((e.clientY - rect.top) * svgHeight) / rect.height;
		return [localX, localY];
	}

	function pushUndo(entry: UndoEntry) {
		undoStack = [...undoStack, entry].slice(-UNDO_STACK_LIMIT);
	}

	function commitStrokes() {
		data.onStrokesCommit(id, strokes);
	}

	// --- Zeichnen -----------------------------------------------------------
	function handlePointerDown(e: PointerEvent) {
		if (!drawMode) return;
		(e.target as Element).setPointerCapture(e.pointerId);
		const [x, y] = localPoint(e);
		currentStroke = [[x, y, e.pressure || 0.5]];
		strokes = [...strokes, currentStroke];
	}

	function handlePointerMove(e: PointerEvent) {
		if (!drawMode || !currentStroke) return;
		const [x, y] = localPoint(e);
		currentStroke.push([x, y, e.pressure || 0.5]);
		// Reassignment nötig, damit Svelte das reaktive Rerender auslöst —
		// currentStroke ist dieselbe Array-Referenz wie strokes[letzter Index].
		strokes = strokes;
	}

	function handlePointerUp() {
		if (!drawMode || !currentStroke) return;
		const finished = currentStroke;
		const index = strokes.length - 1;
		currentStroke = null;
		pushUndo({ type: 'add', stroke: finished, index });
		commitStrokes();
	}

	// --- Radieren -------------------------------------------------------------
	function distanceToStroke(point: [number, number], stroke: Stroke): number {
		let min = Infinity;
		for (const [px, py] of stroke) {
			const d = Math.hypot(point[0] - px, point[1] - py);
			if (d < min) min = d;
		}
		return min;
	}

	function handleEraseClick(e: PointerEvent) {
		if (!eraseMode) return;
		const point = localPoint(e);
		let bestIndex = -1;
		let bestDistance = ERASE_HIT_RADIUS;
		strokes.forEach((stroke, i) => {
			const d = distanceToStroke(point, stroke);
			if (d < bestDistance) {
				bestDistance = d;
				bestIndex = i;
			}
		});
		if (bestIndex === -1) return;
		const removed = strokes[bestIndex];
		strokes = strokes.filter((_, i) => i !== bestIndex);
		pushUndo({ type: 'remove', stroke: removed, index: bestIndex });
		commitStrokes();
	}

	// --- Undo -----------------------------------------------------------------
	function undo() {
		if (undoStack.length === 0) return;
		const entry = undoStack[undoStack.length - 1];
		undoStack = undoStack.slice(0, -1);
		if (entry.type === 'add') {
			strokes = strokes.filter((s) => s !== entry.stroke);
		} else {
			const next = [...strokes];
			next.splice(entry.index, 0, entry.stroke);
			strokes = next;
		}
		commitStrokes();
	}

	// --- Rendering: perfect-freehand-Umrisspolygon -> SVG-Path-String ---------
	// Standard-Helper aus der perfect-freehand-Doku (getSvgPathFromStroke),
	// unverändert übernommen.
	function getSvgPathFromStroke(points: number[][]): string {
		if (!points.length) return '';
		const d = points.reduce(
			(acc: (string | number)[], [x0, y0]: number[], i: number, arr: number[][]) => {
				const [x1, y1] = arr[(i + 1) % arr.length];
				acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
				return acc;
			},
			['M', ...points[0], 'Q'] as (string | number)[]
		);
		d.push('Z');
		return d.join(' ');
	}

	function strokeToPath(stroke: Stroke): string {
		const outline = getStroke(stroke, STROKE_OPTIONS);
		return getSvgPathFromStroke(outline);
	}

	function handleResizeEnd(_event: unknown, params: { width: number; height: number }) {
		data.onResizeEnd(id, params.width, params.height);
	}

	// --- Beschreibung/Alt-Text (1:1 Pattern aus ImageNode) --------------------
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

	function handleDescKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			confirmEdit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEdit();
		}
	}
</script>

<NodeResizer nodeId={id} minWidth={150} minHeight={100} isVisible={selected} onResizeEnd={handleResizeEnd} />

<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />

<div class="sketch-node" style={width && height ? `width: ${width}px; height: ${height}px;` : undefined}>
	<div class="sketch-node__header nodrag">
		<button
			type="button"
			class="sketch-node__icon-btn"
			class:sketch-node__icon-btn--active={drawMode}
			onclick={toggleDraw}
			title="Zeichnen"
		>
			<Pencil class="w-3.5 h-3.5" />
		</button>
		<button
			type="button"
			class="sketch-node__icon-btn"
			class:sketch-node__icon-btn--active={eraseMode}
			onclick={toggleErase}
			title="Radieren"
		>
			<Eraser class="w-3.5 h-3.5" />
		</button>
		<button
			type="button"
			class="sketch-node__icon-btn"
			disabled={undoStack.length === 0}
			onclick={undo}
			title="Rückgängig"
		>
			<Undo2 class="w-3.5 h-3.5" />
		</button>
		<span class="sketch-node__spacer"></span>
		{#if !data.description}
			<div class="sketch-node__badge" title="Keine Beschreibung — für Text-Agenten unsichtbar">
				<EyeOff class="w-3.5 h-3.5" />
			</div>
		{/if}
	</div>

	<div class="sketch-node__body" bind:clientWidth={bodyClientWidth} bind:clientHeight={bodyClientHeight}>
		<svg
			bind:this={svgEl}
			class:nodrag={drawMode || eraseMode}
			class:nopan={drawMode || eraseMode}
			class:sketch-node__svg--draw={drawMode}
			class:sketch-node__svg--erase={eraseMode}
			class="sketch-node__svg"
			style={drawMode || eraseMode ? undefined : 'pointer-events: none;'}
			width={svgWidth}
			height={svgHeight}
			viewBox="0 0 {svgWidth} {svgHeight}"
			preserveAspectRatio="none"
			onpointerdown={(e) => {
				handlePointerDown(e);
				handleEraseClick(e);
			}}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			role="presentation"
		>
			{#each strokes as stroke, i (i)}
				<path d={strokeToPath(stroke)} class="sketch-node__stroke" />
			{/each}
		</svg>
	</div>

	<div class="sketch-node__desc-bar nodrag">
		{#if isEditing}
			<textarea
				bind:this={descriptionInputEl}
				bind:value={descriptionValue}
				onkeydown={handleDescKeydown}
				class="sketch-node__desc-input"
				placeholder="Beschreibung (Alt-Text) eingeben…"
				aria-label="Skizzenbeschreibung"
			></textarea>
			<button type="button" class="sketch-node__icon-btn" onclick={confirmEdit} title="Übernehmen">
				<Check class="w-3.5 h-3.5" style="color: var(--color-success);" />
			</button>
			<button type="button" class="sketch-node__icon-btn" onclick={cancelEdit} title="Abbrechen">
				<X class="w-3.5 h-3.5" />
			</button>
		{:else}
			<span class="sketch-node__desc-text" title={data.description || ''}>
				{data.description || 'Keine Beschreibung'}
			</span>
			<button type="button" class="sketch-node__icon-btn" onclick={startEdit} title="Beschreibung bearbeiten">
				<Pencil class="w-3.5 h-3.5" />
			</button>
		{/if}
	</div>
</div>

<style>
	.sketch-node {
		width: 100%;
		height: 100%;
		min-width: 150px;
		min-height: 100px;
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border: 1px solid var(--edge-strong);
		border-radius: var(--radius-card, 8px);
		box-sizing: border-box;
		overflow: hidden;
	}

	.sketch-node__header {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 8px;
		border-bottom: 1px solid var(--edge-strong);
		flex-shrink: 0;
	}

	.sketch-node__spacer {
		flex: 1;
	}

	.sketch-node__body {
		flex: 1;
		min-height: 0;
		position: relative;
		overflow: hidden;
		background: var(--color-bg);
	}

	.sketch-node__svg {
		display: block;
		width: 100%;
		height: 100%;
		touch-action: none;
	}

	.sketch-node__svg--draw {
		cursor: crosshair;
	}

	.sketch-node__svg--erase {
		cursor: cell;
	}

	.sketch-node__stroke {
		fill: var(--color-text);
	}

	.sketch-node__badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--color-warning) 20%, var(--color-surface));
		color: var(--color-warning);
		border: 1px solid var(--color-warning);
		flex-shrink: 0;
	}

	.sketch-node__icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		flex-shrink: 0;
		color: var(--color-text-secondary);
		background: transparent;
		border-radius: 4px;
	}

	.sketch-node__icon-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.sketch-node__icon-btn:disabled {
		opacity: 0.4;
		pointer-events: none;
	}

	.sketch-node__icon-btn--active {
		background: color-mix(in srgb, var(--color-primary) 18%, transparent);
		color: var(--color-primary);
	}

	.sketch-node__desc-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-top: 1px solid var(--edge-strong);
		flex-shrink: 0;
	}

	.sketch-node__desc-text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		color: var(--color-text-secondary);
	}

	.sketch-node__desc-input {
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
</style>
