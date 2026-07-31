import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { Project } from '$lib/types';

// Validierungsschema für Update
const updateProjectSchema = z.object({
	name: z.string().min(1, 'Name ist erforderlich').optional(),
	description: z.string().nullable().optional(),
	// Archivieren/Reaktivieren (Codeberg kbai-ui#7) — bewusst nur hier über die
	// UI-eigene API, kein MCP-Tool tut das (Kanban AI #503).
	archived: z.boolean().optional()
});

// Helper: Project aus DB-Row mappen
function mapProject(row: any): Project {
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		description: row.description,
		archived: row.archived,
		created_at: row.created_at
	};
}

// GET /api/projects/[id] - Ein einzelnes Projekt abrufen
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const sql = getDb(locals.session.username, locals.session.password);
		const projectId = parseInt(params.id);
		
		if (isNaN(projectId)) {
			return json({ ok: false, error: 'Ungültige Projekt-ID' }, { status: 400 });
		}
		
		const [project] = await sql`SELECT * FROM projects WHERE id = ${projectId}`;
		
		if (!project) {
			return json({ ok: false, error: 'Projekt nicht gefunden' }, { status: 404 });
		}
		
		return json({
			ok: true,
			data: mapProject(project)
		});
	} catch (error) {
		console.error('GET /api/projects/[id] error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Abrufen des Projekts' },
			{ status: 500 }
		);
	}
};

// PATCH /api/projects/[id] - Projekt aktualisieren
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const projectId = parseInt(params.id);
		if (isNaN(projectId)) {
			return json({ ok: false, error: 'Ungültige Projekt-ID' }, { status: 400 });
		}
		
		const body = await request.json();
		const validation = updateProjectSchema.safeParse(body);
		
		if (!validation.success) {
			return json(
				{ ok: false, error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}
		
		const sql = getDb(locals.session.username, locals.session.password);

		// Check if project exists
		const [existing] = await sql`SELECT * FROM projects WHERE id = ${projectId}`;
		if (!existing) {
			return json({ ok: false, error: 'Projekt nicht gefunden' }, { status: 404 });
		}

		const updates: Record<string, unknown> = {};
		if (validation.data.name !== undefined) updates.name = validation.data.name;
		if (validation.data.description !== undefined) updates.description = validation.data.description;
		if (validation.data.archived !== undefined) updates.archived = validation.data.archived;

		if (Object.keys(updates).length === 0) {
			return json({ ok: true, data: mapProject(existing) });
		}

		const [project] = await sql`
			UPDATE projects SET ${sql(updates)} WHERE id = ${projectId} RETURNING *
		`;
		
		return json({
			ok: true,
			data: mapProject(project)
		});
	} catch (error) {
		console.error('PATCH /api/projects/[id] error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Aktualisieren des Projekts' },
			{ status: 500 }
		);
	}
};

// DELETE /api/projects/[id] - Projekt löschen
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const projectId = parseInt(params.id);
		if (isNaN(projectId)) {
			return json({ ok: false, error: 'Ungültige Projekt-ID' }, { status: 400 });
		}
		
		const sql = getDb(locals.session.username, locals.session.password);
		
		// Check if project exists
		const [existing] = await sql`SELECT id FROM projects WHERE id = ${projectId}`;
		if (!existing) {
			return json({ ok: false, error: 'Projekt nicht gefunden' }, { status: 404 });
		}
		
		// Projekt löschen (CASCADE löscht alle abhängigen Datensätze)
		await sql`DELETE FROM projects WHERE id = ${projectId}`;
		
		return json({ ok: true });
	} catch (error) {
		console.error('DELETE /api/projects/[id] error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Löschen des Projekts' },
			{ status: 500 }
		);
	}
};
