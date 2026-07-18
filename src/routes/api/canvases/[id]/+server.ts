import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { Canvas } from '$lib/types';

// Validierungsschema für Update — in diesem Ticket (#526) nur Rename.
const updateCanvasSchema = z.object({
	name: z.string().min(1, 'Name ist erforderlich').optional()
});

function mapCanvas(row: any): Canvas {
	return {
		id: row.id,
		name: row.name,
		created_at: row.created_at,
		updated_at: row.updated_at,
		project_ids: (row.project_ids ?? []).filter((id: number | null) => id !== null),
		element_count: Number(row.element_count ?? 0)
	};
}

// GET /api/canvases/[id] - Ein einzelnes Canvas abrufen
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

		const [canvas] = await sql`
			SELECT
				c.id, c.name, c.created_at, c.updated_at,
				(SELECT array_agg(cp.project_id) FROM canvas_projects cp WHERE cp.canvas_id = c.id) AS project_ids,
				(SELECT COUNT(*) FROM canvas_elements ce WHERE ce.canvas_id = c.id) AS element_count
			FROM canvases c
			WHERE c.id = ${canvasId}
		`;

		if (!canvas) {
			return json({ ok: false, error: 'Canvas nicht gefunden' }, { status: 404 });
		}

		return json({ ok: true, data: mapCanvas(canvas) });
	} catch (error) {
		console.error('GET /api/canvases/[id] error:', error);
		return json({ ok: false, error: 'Fehler beim Abrufen des Canvas' }, { status: 500 });
	}
};

// PATCH /api/canvases/[id] - Canvas umbenennen
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const canvasId = parseInt(params.id);
		if (isNaN(canvasId)) {
			return json({ ok: false, error: 'Ungültige Canvas-ID' }, { status: 400 });
		}

		const body = await request.json();
		const validation = updateCanvasSchema.safeParse(body);

		if (!validation.success) {
			return json({ ok: false, error: validation.error.errors[0].message }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [existing] = await sql`SELECT id FROM canvases WHERE id = ${canvasId}`;
		if (!existing) {
			return json({ ok: false, error: 'Canvas nicht gefunden' }, { status: 404 });
		}

		const updates: Record<string, unknown> = {};
		if (validation.data.name !== undefined) updates.name = validation.data.name;

		if (Object.keys(updates).length > 0) {
			await sql`UPDATE canvases SET ${sql(updates)} WHERE id = ${canvasId}`;
		}

		const [canvas] = await sql`
			SELECT
				c.id, c.name, c.created_at, c.updated_at,
				(SELECT array_agg(cp.project_id) FROM canvas_projects cp WHERE cp.canvas_id = c.id) AS project_ids,
				(SELECT COUNT(*) FROM canvas_elements ce WHERE ce.canvas_id = c.id) AS element_count
			FROM canvases c
			WHERE c.id = ${canvasId}
		`;

		return json({ ok: true, data: mapCanvas(canvas) });
	} catch (error) {
		console.error('PATCH /api/canvases/[id] error:', error);
		return json({ ok: false, error: 'Fehler beim Aktualisieren des Canvas' }, { status: 500 });
	}
};

// DELETE /api/canvases/[id] - Canvas löschen (cascadiert canvas_projects/
// canvas_elements/canvas_edges automatisch über die FKs aus V12).
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const canvasId = parseInt(params.id);
		if (isNaN(canvasId)) {
			return json({ ok: false, error: 'Ungültige Canvas-ID' }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [existing] = await sql`SELECT id FROM canvases WHERE id = ${canvasId}`;
		if (!existing) {
			return json({ ok: false, error: 'Canvas nicht gefunden' }, { status: 404 });
		}

		await sql`DELETE FROM canvases WHERE id = ${canvasId}`;

		return json({ ok: true });
	} catch (error) {
		console.error('DELETE /api/canvases/[id] error:', error);
		return json({ ok: false, error: 'Fehler beim Löschen des Canvas' }, { status: 500 });
	}
};
