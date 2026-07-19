import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { CanvasEdge } from '$lib/types';

const updateEdgeSchema = z.object({
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

// PATCH /api/canvases/[id]/edges/[edgeId] - Label setzen/ändern/leeren
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const canvasId = parseInt(params.id);
		const edgeId = parseInt(params.edgeId);
		if (isNaN(canvasId) || isNaN(edgeId)) {
			return json({ ok: false, error: 'Ungültige ID' }, { status: 400 });
		}

		const body = await request.json();
		const validation = updateEdgeSchema.safeParse(body);
		if (!validation.success) {
			return json({ ok: false, error: validation.error.errors[0].message }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [existing] = await sql`
			SELECT id FROM canvas_edges WHERE id = ${edgeId} AND canvas_id = ${canvasId}
		`;
		if (!existing) {
			return json({ ok: false, error: 'Kante nicht gefunden' }, { status: 404 });
		}

		if (Object.prototype.hasOwnProperty.call(body, 'label')) {
			await sql`UPDATE canvas_edges SET label = ${validation.data.label ?? null} WHERE id = ${edgeId}`;
		}

		const [row] = await sql`SELECT * FROM canvas_edges WHERE id = ${edgeId}`;
		return json({ ok: true, data: mapEdge(row) });
	} catch (error) {
		console.error('PATCH /api/canvases/[id]/edges/[edgeId] error:', error);
		return json({ ok: false, error: 'Fehler beim Aktualisieren der Kante' }, { status: 500 });
	}
};

// DELETE /api/canvases/[id]/edges/[edgeId] - Kante löschen
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const canvasId = parseInt(params.id);
		const edgeId = parseInt(params.edgeId);
		if (isNaN(canvasId) || isNaN(edgeId)) {
			return json({ ok: false, error: 'Ungültige ID' }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [existing] = await sql`
			SELECT id FROM canvas_edges WHERE id = ${edgeId} AND canvas_id = ${canvasId}
		`;
		if (!existing) {
			return json({ ok: false, error: 'Kante nicht gefunden' }, { status: 404 });
		}

		await sql`DELETE FROM canvas_edges WHERE id = ${edgeId}`;

		return json({ ok: true });
	} catch (error) {
		console.error('DELETE /api/canvases/[id]/edges/[edgeId] error:', error);
		return json({ ok: false, error: 'Fehler beim Löschen der Kante' }, { status: 500 });
	}
};
