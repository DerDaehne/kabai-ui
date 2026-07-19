<script lang="ts">
	// Ticket #527: Canvas-Editor — Fläche mit Pan/Zoom (SvelteFlow), Text-
	// Blöcke, Frames, Kanten mit Label, alles persistiert über die
	// Elements-/Edges-API aus diesem Ticket. Grundstruktur (Imports, Setup,
	// Edge-Handling-Pattern, Theming) nach Vorbild WorkflowModal.svelte
	// (#Workflow-Editor) — Dragging, Resize, Custom-Nodes, Frame-Containment
	// sind hier komplett neu, das gibt es in WorkflowModal nicht.
	import { writable } from 'svelte/store';
	import { SvelteFlow, Background, Controls, MarkerType } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import { Type, Frame as FrameIcon, Link as LinkIcon, Image as ImageIcon, PenTool } from 'lucide-svelte';
	import TextNode from './nodes/TextNode.svelte';
	import FrameNode from './nodes/FrameNode.svelte';
	import RefNode from './nodes/RefNode.svelte';
	import ImageNode from './nodes/ImageNode.svelte';
	import SketchNode from './nodes/SketchNode.svelte';
	import LabeledEdge from './nodes/LabeledEdge.svelte';
	import RefPickerDialog from './RefPickerDialog.svelte';
	import SidePanel from '$components/ui/SidePanel.svelte';
	import TicketModal from '$components/tickets/TicketModal.svelte';
	import type { CanvasElement, CanvasEdge, AttachmentUploadResult } from '$lib/types';
	import type { Node, Edge, Connection, NodeTypes, EdgeTypes } from '@xyflow/svelte';

	export let canvasId: number;
	export let elements: CanvasElement[] = [];
	export let edges: CanvasEdge[] = [];
	export let error = '';

	// zIndex-Konvention: Frames rendern "dahinter" (Design-Entscheidung 2).
	const FRAME_Z_INDEX = 0;
	const TEXT_Z_INDEX = 10;

	const DEFAULT_TEXT_SIZE = { width: 200, height: 100 };
	const DEFAULT_FRAME_SIZE = { width: 400, height: 300 };
	const DEFAULT_REF_SIZE = { width: 220, height: 90 };
	const DEFAULT_IMAGE_SIZE = { width: 240, height: 180 };
	const DEFAULT_SKETCH_SIZE = { width: 300, height: 220 };
	// Kaskadierender Versatz bei mehrfachem "+ Text"/"+ Frame"-Klick
	// hintereinander, damit neue Elemente nicht exakt übereinanderliegen
	// (Design-Entscheidung 4). Reset ist bewusst nicht implementiert — die
	// Kaskade wächst über die Lebensdauer der Editor-Session, das ist für den
	// Zweck (sichtbar versetzte Platzierung) ausreichend.
	let cascadeStep = 0;
	function nextCascadeOffset(): { x: number; y: number } {
		const offset = { x: 120 + cascadeStep * 20, y: 120 + cascadeStep * 20 };
		cascadeStep += 1;
		return offset;
	}

	function defaultSizeFor(type: CanvasElement['type']): { width: number; height: number } {
		if (type === 'frame') return DEFAULT_FRAME_SIZE;
		if (type === 'ref') return DEFAULT_REF_SIZE;
		if (type === 'image') return DEFAULT_IMAGE_SIZE;
		if (type === 'sketch') return DEFAULT_SKETCH_SIZE;
		return DEFAULT_TEXT_SIZE;
	}

	function elementToNode(el: CanvasElement): Node {
		const defaults = defaultSizeFor(el.type);
		const width = el.width ?? defaults.width;
		const height = el.height ?? defaults.height;
		const base = {
			id: String(el.id),
			position: { x: el.position_x, y: el.position_y },
			width,
			height,
			// zIndex-Konvention: nur Frames rendern "dahinter" (Design-Entscheidung
			// 2) — Ref-Karten verhalten sich wie Text/Vordergrund-Elemente.
			zIndex: el.type === 'frame' ? FRAME_Z_INDEX : TEXT_Z_INDEX
		};
		if (el.type === 'frame') {
			return {
				...base,
				type: 'frame',
				data: {
					title: el.content.title ?? '',
					onTitleCommit: handleFrameTitleCommit,
					onResizeEnd: handleResizeEnd
				}
			};
		}
		if (el.type === 'ref') {
			return {
				...base,
				type: 'ref',
				data: {
					target_type: el.content.target_type,
					target_id: el.content.target_id,
					onOpenTicket: handleOpenRefTicket
				}
			};
		}
		if (el.type === 'image') {
			return {
				...base,
				type: 'image',
				data: {
					attachment_id: el.content.attachment_id,
					description: el.description,
					onDescriptionCommit: handleImageDescriptionCommit,
					onResizeEnd: handleResizeEnd
				}
			};
		}
		if (el.type === 'sketch') {
			return {
				...base,
				type: 'sketch',
				data: {
					strokes: el.content.strokes ?? [],
					description: el.description,
					onStrokesCommit: handleSketchStrokesCommit,
					onDescriptionCommit: handleSketchDescriptionCommit,
					onResizeEnd: handleResizeEnd
				}
			};
		}
		return {
			...base,
			type: 'text',
			data: {
				text: el.content.text ?? '',
				onTextCommit: handleTextCommit,
				onResizeEnd: handleResizeEnd
			}
		};
	}

	function edgeToFlowEdge(e: CanvasEdge): Edge {
		return {
			id: String(e.id),
			source: String(e.from_element_id),
			target: String(e.to_element_id),
			type: 'labeled',
			data: { label: e.label, onLabelCommit: handleEdgeLabelCommit },
			markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-text-secondary)' }
		};
	}

	const nodes = writable<Node[]>(elements.map(elementToNode));
	const flowEdges = writable<Edge[]>(edges.map(edgeToFlowEdge));

	// Cast auf NodeTypes/EdgeTypes: unsere Custom-Node/Edge-Komponenten
	// deklarieren bewusst nur die Props, die sie tatsächlich nutzen (id, data,
	// selected, width, height), nicht den vollen NodeProps/EdgeProps-Umfang
	// (draggable, deletable, sourcePosition, ...) — SvelteFlow reicht zur
	// Laufzeit ohnehin den vollen Node/Edge durch, TS kennt hier nur die
	// engere, praktisch benötigte Teilmenge.
	const nodeTypes = {
		text: TextNode,
		frame: FrameNode,
		ref: RefNode,
		image: ImageNode,
		sketch: SketchNode
	} as unknown as NodeTypes;
	const edgeTypes = { labeled: LabeledEdge } as unknown as EdgeTypes;

	// --- Persistenz-Helfer -----------------------------------------------
	async function patchElement(elementId: number, body: Record<string, unknown>) {
		try {
			const res = await fetch(`/api/canvases/${canvasId}/elements/${elementId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const result = await res.json();
			if (!result.ok) {
				error = result.error || 'Fehler beim Speichern';
				return null;
			}
			return result.data as CanvasElement;
		} catch {
			error = 'Netzwerkfehler';
			return null;
		}
	}

	// --- Text/Frame committen (on:blur bzw. Titel-Bestätigung) ------------
	async function handleTextCommit(id: string, text: string) {
		const elementId = parseInt(id);
		const el = elements.find((e) => e.id === elementId);
		if (!el) return;
		el.content = { ...el.content, text };
		await patchElement(elementId, { content: { text } });
	}

	async function handleFrameTitleCommit(id: string, title: string) {
		const elementId = parseInt(id);
		const el = elements.find((e) => e.id === elementId);
		if (!el) return;
		el.content = { ...el.content, title };
		nodes.update((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, title } } : n)));
		await patchElement(elementId, { content: { title } });
	}

	async function handleImageDescriptionCommit(id: string, description: string) {
		const elementId = parseInt(id);
		const el = elements.find((e) => e.id === elementId);
		if (!el) return;
		el.description = description;
		nodes.update((ns) =>
			ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, description } } : n))
		);
		await patchElement(elementId, { description });
	}

	async function handleSketchStrokesCommit(id: string, strokes: [number, number, number][][]) {
		const elementId = parseInt(id);
		const el = elements.find((e) => e.id === elementId);
		if (!el) return;
		el.content = { ...el.content, strokes };
		nodes.update((ns) =>
			ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, strokes } } : n))
		);
		await patchElement(elementId, { content: { strokes } });
	}

	async function handleSketchDescriptionCommit(id: string, description: string) {
		const elementId = parseInt(id);
		const el = elements.find((e) => e.id === elementId);
		if (!el) return;
		el.description = description;
		nodes.update((ns) =>
			ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, description } } : n))
		);
		await patchElement(elementId, { description });
	}

	async function handleEdgeLabelCommit(id: string, label: string) {
		const edgeId = parseInt(id);
		flowEdges.update((eds) =>
			eds.map((e) => (e.id === id ? { ...e, data: { ...e.data, label } } : e))
		);
		try {
			const res = await fetch(`/api/canvases/${canvasId}/edges/${edgeId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ label })
			});
			const result = await res.json();
			if (!result.ok) error = result.error || 'Fehler beim Speichern des Labels';
		} catch {
			error = 'Netzwerkfehler';
		}
	}

	// --- Resize-Ende (NodeResizer onResizeEnd) -----------------------------
	async function handleResizeEnd(id: string, width: number, height: number) {
		const elementId = parseInt(id);
		const el = elements.find((e) => e.id === elementId);
		if (!el) return;
		el.width = width;
		el.height = height;
		await patchElement(elementId, { width, height });
	}

	// --- Frame-Containment (nur logisch, Design-Entscheidung 2) ------------
	// Heuristik: Mittelpunkt des gezogenen Elements muss innerhalb des
	// Frame-Rechtecks liegen. Bei mehreren überlappenden Frames gewinnt das
	// zuletzt angelegte (höchste id) — deterministisch und simpel, ein
	// Sonderfall, der in diesem Ticket keine tiefere Regel braucht.
	function findContainingFrame(dragged: CanvasElement): CanvasElement | null {
		const draggedWidth = dragged.width ?? DEFAULT_TEXT_SIZE.width;
		const draggedHeight = dragged.height ?? DEFAULT_TEXT_SIZE.height;
		const centerX = dragged.position_x + draggedWidth / 2;
		const centerY = dragged.position_y + draggedHeight / 2;

		const candidates = elements.filter((e) => e.type === 'frame' && e.id !== dragged.id);
		let best: CanvasElement | null = null;
		for (const frame of candidates) {
			const fw = frame.width ?? DEFAULT_FRAME_SIZE.width;
			const fh = frame.height ?? DEFAULT_FRAME_SIZE.height;
			const withinX = centerX >= frame.position_x && centerX <= frame.position_x + fw;
			const withinY = centerY >= frame.position_y && centerY <= frame.position_y + fh;
			if (withinX && withinY) {
				if (!best || frame.id > best.id) best = frame;
			}
		}
		return best;
	}

	async function handleNodeDragStop(event: CustomEvent<{ targetNode: Node | null; nodes: Node[] }>) {
		const dragged = event.detail.targetNode;
		if (!dragged) return;
		const elementId = parseInt(dragged.id);
		const el = elements.find((e) => e.id === elementId);
		if (!el) return;

		el.position_x = dragged.position.x;
		el.position_y = dragged.position.y;

		const patchBody: Record<string, unknown> = {
			position_x: dragged.position.x,
			position_y: dragged.position.y
		};

		// Frame-Elemente selbst können (in diesem Ticket) keinen Parent haben —
		// Frame-in-Frame-Verschachtelung ist nicht Teil des Scopes.
		if (el.type !== 'frame') {
			const containingFrame = findContainingFrame(el);
			const newParentId = containingFrame ? containingFrame.id : null;
			if (newParentId !== el.parent_frame_id) {
				patchBody.parent_frame_id = newParentId;
				el.parent_frame_id = newParentId;
			}
		}

		await patchElement(elementId, patchBody);
	}

	// --- Anlegen neuer Elemente (Toolbar, Design-Entscheidung 4) -----------
	async function addTextElement() {
		const offset = nextCascadeOffset();
		try {
			const res = await fetch(`/api/canvases/${canvasId}/elements`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'text',
					content: { text: '' },
					position_x: offset.x,
					position_y: offset.y,
					width: DEFAULT_TEXT_SIZE.width,
					height: DEFAULT_TEXT_SIZE.height
				})
			});
			const result = await res.json();
			if (!result.ok) {
				error = result.error || 'Fehler beim Anlegen';
				return;
			}
			const newEl: CanvasElement = result.data;
			elements = [...elements, newEl];
			nodes.update((ns) => [...ns, elementToNode(newEl)]);
		} catch {
			error = 'Netzwerkfehler';
		}
	}

	async function addFrameElement() {
		const offset = nextCascadeOffset();
		try {
			const res = await fetch(`/api/canvases/${canvasId}/elements`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'frame',
					content: { title: 'Neuer Frame' },
					position_x: offset.x,
					position_y: offset.y,
					width: DEFAULT_FRAME_SIZE.width,
					height: DEFAULT_FRAME_SIZE.height
				})
			});
			const result = await res.json();
			if (!result.ok) {
				error = result.error || 'Fehler beim Anlegen';
				return;
			}
			const newEl: CanvasElement = result.data;
			elements = [...elements, newEl];
			nodes.update((ns) => [...ns, elementToNode(newEl)]);
		} catch {
			error = 'Netzwerkfehler';
		}
	}

	// --- Referenz-Karten (Ticket #528) -------------------------------------
	let showRefPicker = false;
	// Vom RefNode-Klick bubbled hoch: EINE gemeinsame SidePanel/TicketModal-
	// Instanz hier statt einer pro Node (Vorbild: onTextCommit/onTitleCommit
	// bubbeln ebenfalls hoch statt dass jede Node ihre eigene Persistenz hätte).
	let openRefTicketId: number | null = null;

	function handleOpenRefTicket(ticketId: number) {
		openRefTicketId = ticketId;
	}

	async function addRefElement(target: { target_type: 'ticket' | 'note'; target_id: number }) {
		showRefPicker = false;
		const offset = nextCascadeOffset();
		try {
			const res = await fetch(`/api/canvases/${canvasId}/elements`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'ref',
					content: { target_type: target.target_type, target_id: target.target_id },
					position_x: offset.x,
					position_y: offset.y,
					width: DEFAULT_REF_SIZE.width,
					height: DEFAULT_REF_SIZE.height
				})
			});
			const result = await res.json();
			if (!result.ok) {
				error = result.error || 'Fehler beim Anlegen';
				return;
			}
			const newEl: CanvasElement = result.data;
			elements = [...elements, newEl];
			nodes.update((ns) => [...ns, elementToNode(newEl)]);
		} catch {
			error = 'Netzwerkfehler';
		}
	}

	// --- Skizzen-Elemente (Ticket #530) ------------------------------------
	// Einstufig wie Text/Frame — kein Upload-Schritt nötig, Inhalt startet
	// leer ({ strokes: [] }), das eigentliche Zeichnen passiert im Node selbst.
	async function addSketchElement() {
		const offset = nextCascadeOffset();
		try {
			const res = await fetch(`/api/canvases/${canvasId}/elements`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'sketch',
					content: { strokes: [] },
					position_x: offset.x,
					position_y: offset.y,
					width: DEFAULT_SKETCH_SIZE.width,
					height: DEFAULT_SKETCH_SIZE.height
				})
			});
			const result = await res.json();
			if (!result.ok) {
				error = result.error || 'Fehler beim Anlegen';
				return;
			}
			const newEl: CanvasElement = result.data;
			elements = [...elements, newEl];
			nodes.update((ns) => [...ns, elementToNode(newEl)]);
		} catch {
			error = 'Netzwerkfehler';
		}
	}

	// --- Bild-Elemente (Ticket #529) ---------------------------------------
	// Zweistufig: erst Datei-Upload nach /api/attachments (liefert die
	// attachment_id), dann erst das eigentliche Canvas-Element mit
	// content.attachment_id anlegen — genau wie im Ticket vorgegeben.
	let imageFileInputEl: HTMLInputElement;

	function triggerImageUpload() {
		imageFileInputEl?.click();
	}

	async function handleImageFileSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		try {
			const formData = new FormData();
			formData.append('file', file);
			const uploadRes = await fetch('/api/attachments', { method: 'POST', body: formData });
			const uploadResult = await uploadRes.json();
			if (!uploadResult.ok) {
				error = uploadResult.error || 'Fehler beim Hochladen des Bildes';
				return;
			}
			const uploaded: AttachmentUploadResult = uploadResult.data;

			const offset = nextCascadeOffset();
			const res = await fetch(`/api/canvases/${canvasId}/elements`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'image',
					content: { attachment_id: uploaded.id },
					position_x: offset.x,
					position_y: offset.y,
					width: DEFAULT_IMAGE_SIZE.width,
					height: DEFAULT_IMAGE_SIZE.height
				})
			});
			const result = await res.json();
			if (!result.ok) {
				error = result.error || 'Fehler beim Anlegen';
				return;
			}
			const newEl: CanvasElement = result.data;
			elements = [...elements, newEl];
			nodes.update((ns) => [...ns, elementToNode(newEl)]);
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			// Input zurücksetzen, damit dieselbe Datei nach Beheben eines
			// Fehlers (z.B. falscher Typ) erneut ausgewählt werden kann — ohne
			// Reset feuert "change" beim erneuten Auswählen derselben Datei nicht.
			input.value = '';
		}
	}

	// --- Kanten anlegen (Design-Entscheidung 6) ----------------------------
	// WICHTIG: SvelteFlow fügt bei einer Connect-Geste INTERN bereits selbst
	// eine Edge in den Store ein (Handle.svelte ruft store-internes addEdge()
	// auf, unabhängig vom onconnect-Prop, das nur eine Benachrichtigung ist —
	// kein Rückgabewert-Kanal). Ohne Gegenmaßnahme entsteht dadurch eine
	// namenlose Default-Edge (Typ "default"/BezierEdge, id "xy-edge__…"),
	// NICHT unser LabeledEdge — onedgecreate ist der vorgesehene Hook, um die
	// Edge synchron VOR dem internen addEdge() zu formen. Da die echte
	// DB-Edge-ID erst nach dem asynchronen POST bekannt ist, bekommt die Edge
	// hier zunächst eine temporäre id; nach Serverantwort wird sie durch die
	// echte ID ersetzt (Edge bleibt dieselbe Objektidentität im Store, nur
	// id/data werden aktualisiert).
	function onedgecreate(connection: Connection): Edge {
		const tempId = `temp-${connection.source}-${connection.target}-${Date.now()}`;
		return {
			id: tempId,
			source: connection.source,
			target: connection.target,
			sourceHandle: connection.sourceHandle,
			targetHandle: connection.targetHandle,
			type: 'labeled',
			data: { label: null, onLabelCommit: handleEdgeLabelCommit },
			markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-text-secondary)' }
		};
	}

	async function onconnect(connection: Connection) {
		const fromId = parseInt(connection.source);
		const toId = parseInt(connection.target);
		if (fromId === toId) return;
		const tempId = `temp-${connection.source}-${connection.target}-`;
		try {
			const res = await fetch(`/api/canvases/${canvasId}/edges`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ from_element_id: fromId, to_element_id: toId })
			});
			const result = await res.json();
			if (!result.ok) {
				error = result.error || 'Fehler beim Verbinden';
				// Temporäre Edge wieder entfernen, da die DB sie abgelehnt hat
				// (z.B. Trigger-Fehler bei Canvas-übergreifender Kante).
				flowEdges.update((eds) => eds.filter((e) => !e.id.startsWith(tempId)));
				return;
			}
			const newEdge: CanvasEdge = result.data;
			edges = [...edges, newEdge];
			flowEdges.update((eds) =>
				eds.map((e) => (e.id.startsWith(tempId) ? edgeToFlowEdge(newEdge) : e))
			);
		} catch {
			error = 'Netzwerkfehler';
			flowEdges.update((eds) => eds.filter((e) => !e.id.startsWith(tempId)));
		}
	}

	// --- Löschen (Nodes + Edges über xyflows Selektion + Entf) -------------
	// ondelete ist ein echtes Prop (OnDelete-Typ), kein dispatchtes Custom-
	// Event wie nodedragstop — SvelteFlow ruft es direkt mit dem
	// {nodes, edges}-Objekt auf, ohne CustomEvent-Wrapper.
	async function ondelete({ nodes: deletedNodes, edges: deletedEdges }: { nodes: Node[]; edges: Edge[] }) {
		for (const node of deletedNodes) {
			const elementId = parseInt(node.id);
			elements = elements.filter((e) => e.id !== elementId);
			try {
				await fetch(`/api/canvases/${canvasId}/elements/${elementId}`, { method: 'DELETE' });
			} catch {
				error = 'Netzwerkfehler beim Löschen';
			}
		}
		for (const edge of deletedEdges) {
			const edgeId = parseInt(edge.id);
			edges = edges.filter((e) => e.id !== edgeId);
			try {
				await fetch(`/api/canvases/${canvasId}/edges/${edgeId}`, { method: 'DELETE' });
			} catch {
				error = 'Netzwerkfehler beim Löschen';
			}
		}

		// Löscht man einen Frame, gibt V12 (ON DELETE SET NULL) dessen Kinder
		// serverseitig frei — hier die betroffenen Kinder im lokalen State +
		// im Node-Array nachziehen, damit die UI sofort konsistent ist (statt
		// erst nach einem manuellen Refresh).
		const deletedFrameIds = new Set(
			deletedNodes.filter((n) => n.type === 'frame').map((n) => parseInt(n.id))
		);
		if (deletedFrameIds.size > 0) {
			elements = elements.map((e) =>
				e.parent_frame_id !== null && deletedFrameIds.has(e.parent_frame_id)
					? { ...e, parent_frame_id: null }
					: e
			);
		}
	}
</script>

<div class="canvas-editor">
	<div class="canvas-editor__toolbar">
		<button type="button" class="btn btn-ghost flex items-center gap-2" onclick={addTextElement}>
			<Type class="w-4 h-4" /> + Text
		</button>
		<button type="button" class="btn btn-ghost flex items-center gap-2" onclick={addFrameElement}>
			<FrameIcon class="w-4 h-4" /> + Frame
		</button>
		<button type="button" class="btn btn-ghost flex items-center gap-2" onclick={() => (showRefPicker = true)}>
			<LinkIcon class="w-4 h-4" /> + Referenz
		</button>
		<button type="button" class="btn btn-ghost flex items-center gap-2" onclick={triggerImageUpload}>
			<ImageIcon class="w-4 h-4" /> + Bild
		</button>
		<button type="button" class="btn btn-ghost flex items-center gap-2" onclick={addSketchElement}>
			<PenTool class="w-4 h-4" /> + Skizze
		</button>
		<input
			bind:this={imageFileInputEl}
			type="file"
			accept="image/png,image/jpeg,image/webp,image/gif"
			onchange={handleImageFileSelected}
			class="canvas-editor__hidden-file-input"
			aria-hidden="true"
			tabindex="-1"
		/>
	</div>

	<div class="canvas-editor__flow">
		<SvelteFlow
			{nodes}
			edges={flowEdges}
			{nodeTypes}
			{edgeTypes}
			{onconnect}
			{onedgecreate}
			{ondelete}
			on:nodedragstop={handleNodeDragStop}
			deleteKey={['Delete', 'Backspace']}
			minZoom={0.1}
			maxZoom={2}
			fitView
			style="background: var(--color-bg);"
		>
			<Background style="color: var(--edge-strong);" />
			<Controls style="background: var(--color-surface); border-color: var(--edge-strong);" />
		</SvelteFlow>
	</div>
</div>

<!-- Ref-Picker: neue Referenz-Karte suchen/anlegen (Ticket #528) -->
<SidePanel open={showRefPicker} onClose={() => (showRefPicker = false)} size="md" ariaLabel="Referenz einfügen">
	{#if showRefPicker}
		<RefPickerDialog onSelect={addRefElement} />
	{/if}
</SidePanel>

<!-- Ticket/Epic aus einer Ref-Karte öffnen: EINE gemeinsame Instanz statt einer
     pro RefNode (Ticket #528, gleiches Muster wie z.B. projects/[id]/+page.svelte). -->
<SidePanel open={openRefTicketId !== null} onClose={() => (openRefTicketId = null)} size="md" ariaLabel="Ticket-Details">
	{#if openRefTicketId !== null}
		<TicketModal ticketId={openRefTicketId} onClose={() => (openRefTicketId = null)} />
	{/if}
</SidePanel>

<style>
	.canvas-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
	}

	.canvas-editor__toolbar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		border-bottom: 1px solid var(--edge);
		flex-shrink: 0;
	}

	.canvas-editor__flow {
		flex: 1;
		min-height: 0;
	}

	/* Verstecktes <input type="file">, per Klick auf den "+ Bild"-Button
	   ausgelöst (bind:this + .click()) — Standard-Pattern für
	   custom-gestylte Datei-Uploads. */
	.canvas-editor__hidden-file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	/* SvelteFlow-Theming über --xy-*-Variablen (v0.1.x), 1:1 nach Vorbild
	   WorkflowModal.svelte auf das Graphit/Indigo-Tokensystem gemappt. */
	.canvas-editor__flow :global(.svelte-flow) {
		--xy-background-color: var(--color-bg);
		--xy-background-color-default: var(--color-bg);

		--xy-node-background-color: var(--color-surface);
		--xy-node-background-color-default: var(--color-surface);
		--xy-node-color: var(--color-text);
		--xy-node-color-default: var(--color-text);
		--xy-node-border: 1px solid var(--edge-strong);
		--xy-node-border-default: 1px solid var(--edge-strong);
		--xy-node-boxshadow-hover: none;
		--xy-node-boxshadow-hover-default: none;
		--xy-node-boxshadow-selected: 0 0 0 1.5px var(--color-primary);
		--xy-node-boxshadow-selected-default: 0 0 0 1.5px var(--color-primary);

		--xy-edge-stroke: var(--color-text-secondary);
		--xy-edge-stroke-default: var(--color-text-secondary);
		--xy-edge-stroke-width: 2;
		--xy-edge-stroke-width-default: 2;
		--xy-edge-stroke-selected: var(--color-primary);
		--xy-edge-stroke-selected-default: var(--color-primary);

		--xy-connectionline-stroke: var(--color-primary);
		--xy-connectionline-stroke-default: var(--color-primary);

		--xy-handle-background-color: var(--color-text-secondary);
		--xy-handle-background-color-default: var(--color-text-secondary);
		--xy-handle-border-color: var(--color-bg);
		--xy-handle-border-color-default: var(--color-bg);

		--xy-selection-background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
		--xy-selection-background-color-default: color-mix(in srgb, var(--color-primary) 8%, transparent);
		--xy-selection-border: 1px dotted var(--color-primary);
		--xy-selection-border-default: 1px dotted var(--color-primary);

		--xy-minimap-background-color: var(--color-surface);
		--xy-minimap-background-color-default: var(--color-surface);

		--xy-controls-button-background-color: var(--color-surface);
		--xy-controls-button-background-color-default: var(--color-surface);
		--xy-controls-button-background-color-hover: var(--color-surface-hover);
		--xy-controls-button-background-color-hover-default: var(--color-surface-hover);
		--xy-controls-button-color: var(--color-text-secondary);
		--xy-controls-button-color-default: var(--color-text-secondary);
		--xy-controls-button-color-hover: var(--color-text);
		--xy-controls-button-color-hover-default: var(--color-text);
		--xy-controls-button-border-color: var(--edge-strong);
		--xy-controls-button-border-color-default: var(--edge-strong);
		--xy-controls-box-shadow: none;
		--xy-controls-box-shadow-default: none;

		--xy-edge-label-background-color: var(--color-surface);
		--xy-edge-label-background-color-default: var(--color-surface);
		--xy-edge-label-color: var(--color-text);
		--xy-edge-label-color-default: var(--color-text);
	}

	.canvas-editor__flow :global(.svelte-flow__node:hover) {
		box-shadow: none !important;
	}

	.canvas-editor__flow :global(.svelte-flow__node.selected) {
		box-shadow: 0 0 0 1.5px var(--color-primary) !important;
	}

	.canvas-editor__flow :global(.svelte-flow__attribution) {
		background: transparent;
		color: var(--text-muted);
	}

	/* xyflow elevates a selected node to inline z-index 1000
	   (elevateNodesOnSelect, not configurable in 0.1.x). Individual
	   .svelte-flow__node elements establish their own stacking context
	   directly under the viewport, so a child z-index set only inside
	   .svelte-flow__edgelabel-renderer (see LabeledEdge.svelte) is capped by
	   that renderer's OWN z-index (0 by default) when compared against a
	   selected node one level up — raising the renderer itself is what
	   actually keeps edge labels clickable above an elevated node. */
	.canvas-editor__flow :global(.svelte-flow__edgelabel-renderer) {
		z-index: 1002;
	}
</style>
