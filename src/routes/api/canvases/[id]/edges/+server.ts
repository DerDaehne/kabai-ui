import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { CanvasEdge } from '$lib/types';

const createEdgeSchema = z.object({
	from_element_id: z.number().int(),
	to_element_id: z.number().int(),
	label: z.string().nullable().optional()
});

function mapEdge(row: any): CanvasEdge {
	return {
		id: row.id,
		canvas_id: row.canvas_id,
		from_element_id: row.from_element_id,
		to_element_id: row.to_element_id,
		label: row.label,
		created_at: row.created_at
	};
}

// GET /api/canvases/[id]/edges - Alle Kanten eines Canvas
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

		const edges = await sql`SELECT * FROM canvas_edges WHERE canvas_id = ${canvasId} ORDER BY id ASC`;

		return json({ ok: true, data: edges.map(mapEdge) });
	} catch (error) {
		console.error('GET /api/canvases/[id]/edges error:', error);
		return json({ ok: false, error: 'Fehler beim Abrufen der Kanten' }, { status: 500 });
	}
};

// POST /api/canvases/[id]/edges - Neue Kante anlegen (Label zunächst optional/NULL)
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
		const validation = createEdgeSchema.safeParse(body);
		if (!validation.success) {
			return json({ ok: false, error: validation.error.errors[0].message }, { status: 400 });
		}

		const { from_element_id, to_element_id, label = null } = validation.data;
		const sql = getDb(locals.session.username, locals.session.password);

		const [canvas] = await sql`SELECT id FROM canvases WHERE id = ${canvasId}`;
		if (!canvas) {
			return json({ ok: false, error: 'Canvas nicht gefunden' }, { status: 404 });
		}

		const [row] = await sql`
			INSERT INTO canvas_edges (canvas_id, from_element_id, to_element_id, label)
			VALUES (${canvasId}, ${from_element_id}, ${to_element_id}, ${label})
			RETURNING *
		`;

		return json({ ok: true, data: mapEdge(row) }, { status: 201 });
	} catch (error: any) {
		console.error('POST /api/canvases/[id]/edges error:', error);

		// Trigger verify_canvas_edge_endpoints (V12): Endpunkte liegen nicht auf
		// diesem Canvas. Check-Constraint check_canvas_edge_not_self: from==to.
		if (error.message?.includes('Canvas integrity')) {
			return json({ ok: false, error: error.message }, { status: 400 });
		}
		if (error.message?.includes('violates check constraint') && error.message?.includes('check_canvas_edge_not_self')) {
			return json({ ok: false, error: 'Ein Element kann keine Kante zu sich selbst haben' }, { status: 400 });
		}
		if (error.message?.includes('violates foreign key constraint')) {
			return json({ ok: false, error: 'Eines der referenzierten Elemente existiert nicht' }, { status: 400 });
		}

		return json({ ok: false, error: 'Fehler beim Anlegen der Kante' }, { status: 500 });
	}
};
