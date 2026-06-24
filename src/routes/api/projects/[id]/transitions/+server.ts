import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { StatusTransition } from '$lib/types';

// Validierungsschemas
const createTransitionSchema = z.object({
	from_status_id: z.number().int().min(1, 'Quell-Status-ID ist erforderlich'),
	to_status_id: z.number().int().min(1, 'Ziel-Status-ID ist erforderlich')
});

// GET /api/projects/[id]/transitions - Alle Transitions abrufen
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const projectId = parseInt(params.id);
		if (isNaN(projectId)) {
			return json({ ok: false, error: 'Ungültige Projekt-ID' }, { status: 400 });
		}
		
		const sql = getDb(locals.session.username, locals.session.password);
		
		const transitions = await sql`
			SELECT * FROM status_transitions
			WHERE project_id = ${projectId}
			ORDER BY from_status_id, to_status_id
		`;
		
		return json({
			ok: true,
			data: transitions.map((row: any) => ({
				project_id: row.project_id,
				from_status_id: row.from_status_id,
				to_status_id: row.to_status_id
			}))
		});
	} catch (error) {
		console.error('GET /api/projects/[id]/transitions error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Abrufen der Transitions' },
			{ status: 500 }
		);
	}
};

// POST /api/projects/[id]/transitions - Neue Transition erstellen
export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const projectId = parseInt(params.id);
		if (isNaN(projectId)) {
			return json({ ok: false, error: 'Ungültige Projekt-ID' }, { status: 400 });
		}
		
		const body = await request.json();
		const validation = createTransitionSchema.safeParse(body);
		
		if (!validation.success) {
			return json(
				{ ok: false, error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}
		
		const { from_status_id, to_status_id } = validation.data;
		
		// Selbst-Referenz prüfen
		if (from_status_id === to_status_id) {
			return json(
				{ ok: false, error: 'Ein Status kann nicht zu sich selbst verschoben werden' },
				{ status: 409 }
			);
		}
		
		const sql = getDb(locals.session.username, locals.session.password);
		
		// Prüfen ob Projekt existiert
		const [existingProject] = await sql`SELECT id FROM projects WHERE id = ${projectId}`;
		if (!existingProject) {
			return json({ ok: false, error: 'Projekt nicht gefunden' }, { status: 404 });
		}
		
		// Prüfen ob Quell-Status existiert und zum Projekt gehört
		const [fromStatus] = await sql`
			SELECT id FROM board_statuses
			WHERE id = ${from_status_id} AND project_id = ${projectId}
		`;
		
		if (!fromStatus) {
			return json({ ok: false, error: 'Quell-Status nicht gefunden oder gehört nicht zu diesem Projekt' }, { status: 400 });
		}
		
		// Prüfen ob Ziel-Status existiert und zum Projekt gehört
		const [toStatus] = await sql`
			SELECT id FROM board_statuses
			WHERE id = ${to_status_id} AND project_id = ${projectId}
		`;
		
		if (!toStatus) {
			return json({ ok: false, error: 'Ziel-Status nicht gefunden oder gehört nicht zu diesem Projekt' }, { status: 400 });
		}
		
		// Prüfen ob Transition bereits existiert
		const [existingTransition] = await sql`
			SELECT * FROM status_transitions
			WHERE project_id = ${projectId} 
			AND from_status_id = ${from_status_id}
			AND to_status_id = ${to_status_id}
		`;
		
		if (existingTransition) {
			return json(
				{ ok: false, error: 'Diese Transition existiert bereits' },
				{ status: 409 }
			);
		}
		
		// Transition erstellen
		await sql`
			INSERT INTO status_transitions (project_id, from_status_id, to_status_id)
			VALUES (${projectId}, ${from_status_id}, ${to_status_id})
		`;
		
		return json({
			ok: true
		}, { status: 201 });
	} catch (error: any) {
		console.error('POST /api/projects/[id]/transitions error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Erstellen der Transition' },
			{ status: 500 }
		);
	}
};
