import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { Canvas } from '$lib/types';

// Validierungsschema für Anlegen. Anders als Projects hat Canvas keinen Slug
// im Schema (V12__Canvas_Schema.sql) — nur der Name ist Pflicht.
const createCanvasSchema = z.object({
	name: z.string().min(1, 'Name ist erforderlich'),
	project_ids: z.array(z.number().int()).optional()
});

// Helper: Canvas-Row (inkl. project_ids/element_count aus den Subqueries
// unten) auf den API-Typ mappen.
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

// GET /api/canvases - Alle Canvases abrufen, optional nach Projekt gefiltert
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const projectIdParam = url.searchParams.get('project_id');
		let projectId: number | null = null;
		if (projectIdParam !== null) {
			projectId = parseInt(projectIdParam);
			if (isNaN(projectId)) {
				return json({ ok: false, error: 'Ungültige Projekt-ID' }, { status: 400 });
			}
		}

		// project_ids als array_agg (n:m via canvas_projects) und element_count
		// per COUNT auf canvas_elements — beides für die Kartenanzeige. Der
		// optionale Projekt-Filter läuft als EXISTS-Subquery, damit er die
		// array_agg-Aggregation nicht verfälscht (die zeigt immer ALLE
		// verknüpften Projekte, auch wenn nach einem einzelnen gefiltert wird).
		const canvases = await sql`
			SELECT
				c.id, c.name, c.created_at, c.updated_at,
				(SELECT array_agg(cp.project_id) FROM canvas_projects cp WHERE cp.canvas_id = c.id) AS project_ids,
				(SELECT COUNT(*) FROM canvas_elements ce WHERE ce.canvas_id = c.id) AS element_count
			FROM canvases c
			${projectId !== null
				? sql`WHERE EXISTS (SELECT 1 FROM canvas_projects cp WHERE cp.canvas_id = c.id AND cp.project_id = ${projectId})`
				: sql``}
			ORDER BY c.updated_at DESC
		`;

		return json({ ok: true, data: canvases.map(mapCanvas) });
	} catch (error) {
		console.error('GET /api/canvases error:', error);
		return json({ ok: false, error: 'Fehler beim Abrufen der Canvases' }, { status: 500 });
	}
};

// POST /api/canvases - Neues Canvas erstellen, optional sofort mit Projekten verknüpfen
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const validation = createCanvasSchema.safeParse(body);

		if (!validation.success) {
			return json({ ok: false, error: validation.error.errors[0].message }, { status: 400 });
		}

		const { name, project_ids } = validation.data;
		const sql = getDb(locals.session.username, locals.session.password);

		const canvas = await sql.begin(async (tx) => {
			const [row] = await tx`
				INSERT INTO canvases (name)
				VALUES (${name})
				RETURNING *
			`;

			const uniqueProjectIds = [...new Set(project_ids ?? [])];
			for (const projectId of uniqueProjectIds) {
				await tx`
					INSERT INTO canvas_projects (canvas_id, project_id)
					VALUES (${row.id}, ${projectId})
					ON CONFLICT DO NOTHING
				`;
			}

			return { ...row, project_ids: uniqueProjectIds, element_count: 0 };
		});

		return json({ ok: true, data: mapCanvas(canvas) }, { status: 201 });
	} catch (error: any) {
		console.error('POST /api/canvases error:', error);

		// FK-Verletzung: eine der übergebenen project_ids existiert nicht
		if (error.message?.includes('violates foreign key constraint')) {
			return json({ ok: false, error: 'Eines der verknüpften Projekte existiert nicht' }, { status: 400 });
		}

		return json({ ok: false, error: 'Fehler beim Erstellen des Canvas' }, { status: 500 });
	}
};
