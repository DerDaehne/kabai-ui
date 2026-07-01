import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { BoardStatus } from '$lib/types';

// Validierungsschemas
const createStatusSchema = z.object({
	name: z.string().min(1).regex(/^[a-z0-9_]+$/, 'Name darf nur Kleinbuchstaben, Zahlen und Unterstriche enthalten'),
	display_name: z.string().min(1, 'Anzeigename ist erforderlich'),
	position: z.number().int().min(0, 'Position muss eine positive Zahl sein'),
	agent_role_instruction: z.string().nullable().optional()
});

const updateStatusSchema = z.object({
	display_name: z.string().min(1, 'Anzeigename ist erforderlich').optional(),
	position: z.number().int().min(0, 'Position muss eine positive Zahl sein').optional(),
	agent_role_instruction: z.string().nullable().optional()
});

const reorderSchema = z.object({
	ordered_ids: z.array(z.number().int()).min(1, 'Mindestens eine ID ist erforderlich')
});

// Helper: BoardStatus aus DB-Row mappen
function mapBoardStatus(row: any): BoardStatus {
	return {
		id: row.id,
		project_id: row.project_id,
		name: row.name,
		display_name: row.display_name,
		position: row.position,
		agent_role_instruction: row.agent_role_instruction,
		special_type: row.special_type ?? null,
		created_at: row.created_at
	};
}

// GET /api/projects/[id]/statuses - Alle Statuses abrufen
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
		const statuses = await sql`
			SELECT * FROM board_statuses 
			WHERE project_id = ${projectId}
			ORDER BY position ASC
		`;
		
		return json({
			ok: true,
			data: statuses.map(mapBoardStatus)
		});
	} catch (error) {
		console.error('GET /api/projects/[id]/statuses error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Abrufen der Statuses' },
			{ status: 500 }
		);
	}
};

// POST /api/projects/[id]/statuses - Neuen Status erstellen
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
		const validation = createStatusSchema.safeParse(body);
		
		if (!validation.success) {
			return json(
				{ ok: false, error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}
		
		const { name, display_name, position, agent_role_instruction } = validation.data;
		const sql = getDb(locals.session.username, locals.session.password);
		
		// Prüfen ob Projekt existiert
		const [existingProject] = await sql`SELECT id FROM projects WHERE id = ${projectId}`;
		if (!existingProject) {
			return json({ ok: false, error: 'Projekt nicht gefunden' }, { status: 404 });
		}
		
		// Prüfen ob name bereits existiert für dieses Projekt
		const [existingStatus] = await sql`
			SELECT id FROM board_statuses 
			WHERE project_id = ${projectId} AND name = ${name}
		`;
		if (existingStatus) {
			return json(
				{ ok: false, error: `Ein Status mit dem Namen '${name}' existiert bereits für dieses Projekt` },
				{ status: 409 }
			);
		}
		
		const [status] = await sql`
			INSERT INTO board_statuses (project_id, name, display_name, position, agent_role_instruction)
			VALUES (${projectId}, ${name}, ${display_name}, ${position}, ${agent_role_instruction})
			RETURNING *
		`;
		
		return json({
			ok: true,
			data: mapBoardStatus(status)
		}, { status: 201 });
	} catch (error: any) {
		console.error('POST /api/projects/[id]/statuses error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Erstellen des Status' },
			{ status: 500 }
		);
	}
};

// PUT /api/projects/[id]/statuses/reorder - Statuses neu ordnen
export const PUT: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const projectId = parseInt(params.id);
		if (isNaN(projectId)) {
			return json({ ok: false, error: 'Ungültige Projekt-ID' }, { status: 400 });
		}
		
		const body = await request.json();
		const validation = reorderSchema.safeParse(body);
		
		if (!validation.success) {
			return json(
				{ ok: false, error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}
		
		const { ordered_ids } = validation.data;
		const sql = getDb(locals.session.username, locals.session.password);
		
		// Transaktion für Reorder
		for (let i = 0; i < ordered_ids.length; i++) {
			await sql`
				UPDATE board_statuses
				SET position = ${i}
				WHERE id = ${ordered_ids[i]} AND project_id = ${projectId}
			`;
		}
		
		return json({ ok: true });
	} catch (error) {
		console.error('PUT /api/projects/[id]/statuses/reorder error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Neuordnen der Statuses' },
			{ status: 500 }
		);
	}
};
