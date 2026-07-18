import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';

const linkSchema = z.object({
	project_id: z.number().int()
});

// POST /api/canvases/[id]/projects - Projekt mit Canvas verknüpfen
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
		const validation = linkSchema.safeParse(body);
		if (!validation.success) {
			return json({ ok: false, error: validation.error.errors[0].message }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [canvas] = await sql`SELECT id FROM canvases WHERE id = ${canvasId}`;
		if (!canvas) {
			return json({ ok: false, error: 'Canvas nicht gefunden' }, { status: 404 });
		}

		await sql`
			INSERT INTO canvas_projects (canvas_id, project_id)
			VALUES (${canvasId}, ${validation.data.project_id})
			ON CONFLICT DO NOTHING
		`;

		return json({ ok: true }, { status: 201 });
	} catch (error: any) {
		console.error('POST /api/canvases/[id]/projects error:', error);

		if (error.message?.includes('violates foreign key constraint')) {
			return json({ ok: false, error: 'Projekt existiert nicht' }, { status: 400 });
		}

		return json({ ok: false, error: 'Fehler beim Verknüpfen des Projekts' }, { status: 500 });
	}
};

// DELETE /api/canvases/[id]/projects - Projekt von Canvas lösen.
// project_id als Body-Feld (konsistent mit POST auf derselben Route statt
// eines Query-Params).
export const DELETE: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const canvasId = parseInt(params.id);
		if (isNaN(canvasId)) {
			return json({ ok: false, error: 'Ungültige Canvas-ID' }, { status: 400 });
		}

		const body = await request.json();
		const validation = linkSchema.safeParse(body);
		if (!validation.success) {
			return json({ ok: false, error: validation.error.errors[0].message }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		await sql`
			DELETE FROM canvas_projects
			WHERE canvas_id = ${canvasId} AND project_id = ${validation.data.project_id}
		`;

		return json({ ok: true });
	} catch (error) {
		console.error('DELETE /api/canvases/[id]/projects error:', error);
		return json({ ok: false, error: 'Fehler beim Lösen der Projektverknüpfung' }, { status: 500 });
	}
};
