import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { CanvasElement } from '$lib/types';

// Ticket #527/#528/#529: Elemente eines Canvas — 'text'/'frame'/'ref'/'image'
// sind anlegbar ('sketch' kommt in einem Folgeticket #530, das DB-CHECK in
// V12__Canvas_Schema.sql erlaubt es zwar schon, die Zod-Validierung hier
// bewusst noch nicht). content bleibt bewusst ein loses "alle Felder optional,
// unabhängig vom type"-Objekt (bestehende Konvention), keine typspezifische
// Discriminated-Union-Validierung.
const createElementSchema = z.object({
	type: z.enum(['text', 'frame', 'ref', 'image']),
	content: z.object({
		text: z.string().optional(),
		title: z.string().optional(),
		target_type: z.enum(['ticket', 'note']).optional(),
		target_id: z.number().int().optional(),
		attachment_id: z.number().int().optional()
	}),
	position_x: z.number(),
	position_y: z.number(),
	width: z.number().nullable().optional(),
	height: z.number().nullable().optional(),
	z_order: z.number().int().optional(),
	parent_frame_id: z.number().int().nullable().optional()
});

function mapElement(row: any): CanvasElement {
	return {
		id: row.id,
		canvas_id: row.canvas_id,
		type: row.type,
		position_x: Number(row.position_x),
		position_y: Number(row.position_y),
		width: row.width === null ? null : Number(row.width),
		height: row.height === null ? null : Number(row.height),
		z_order: row.z_order,
		content: row.content ?? {},
		description: row.description,
		parent_frame_id: row.parent_frame_id,
		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

// GET /api/canvases/[id]/elements - Alle Elemente eines Canvas
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const canvasId = parseInt(params.id);
		if (isNaN(canvasId)) {
			return json({ ok: false, error: 'Ungültige Canvas-ID' }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [canvas] = await sql`SELECT id FROM canvases WHERE id = ${canvasId}`;
		if (!canvas) {
			return json({ ok: false, error: 'Canvas nicht gefunden' }, { status: 404 });
		}

		const elements = await sql`
			SELECT * FROM canvas_elements WHERE canvas_id = ${canvasId} ORDER BY z_order ASC, id ASC
		`;

		return json({ ok: true, data: elements.map(mapElement) });
	} catch (error) {
		console.error('GET /api/canvases/[id]/elements error:', error);
		return json({ ok: false, error: 'Fehler beim Abrufen der Elemente' }, { status: 500 });
	}
};

// POST /api/canvases/[id]/elements - Neues Element anlegen
export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const canvasId = parseInt(params.id);
		if (isNaN(canvasId)) {
			return json({ ok: false, error: 'Ungültige Canvas-ID' }, { status: 400 });
		}

		const body = await request.json();
		const validation = createElementSchema.safeParse(body);
		if (!validation.success) {
			return json({ ok: false, error: validation.error.errors[0].message }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [canvas] = await sql`SELECT id FROM canvases WHERE id = ${canvasId}`;
		if (!canvas) {
			return json({ ok: false, error: 'Canvas nicht gefunden' }, { status: 404 });
		}

		const {
			type,
			content,
			position_x,
			position_y,
			width = null,
			height = null,
			z_order = 0,
			parent_frame_id = null
		} = validation.data;

		const [row] = await sql`
			INSERT INTO canvas_elements
				(canvas_id, type, content, position_x, position_y, width, height, z_order, parent_frame_id)
			VALUES
				(${canvasId}, ${type}, ${sql.json(content)}, ${position_x}, ${position_y}, ${width}, ${height}, ${z_order}, ${parent_frame_id})
			RETURNING *
		`;

		return json({ ok: true, data: mapElement(row) }, { status: 201 });
	} catch (error: any) {
		console.error('POST /api/canvases/[id]/elements error:', error);

		// Trigger verify_canvas_element_parent (V12): parent_frame_id zeigt auf
		// kein Frame-Element, oder Frame liegt auf einem anderen Canvas. Die
		// RAISE EXCEPTION-Texte sind bereits sprechend genug für die UI.
		if (error.message?.includes('Canvas integrity')) {
			return json({ ok: false, error: error.message }, { status: 400 });
		}
		if (error.message?.includes('violates foreign key constraint')) {
			return json({ ok: false, error: 'Referenziertes Frame-Element existiert nicht' }, { status: 400 });
		}
		if (error.message?.includes('violates check constraint')) {
			return json({ ok: false, error: 'Ungültiger Element-Typ' }, { status: 400 });
		}

		return json({ ok: false, error: 'Fehler beim Anlegen des Elements' }, { status: 500 });
	}
};
