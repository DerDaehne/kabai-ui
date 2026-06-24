import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { BoardStatus } from '$lib/types';

// Validierungsschema für Update
const updateStatusSchema = z.object({
	display_name: z.string().min(1, 'Anzeigename ist erforderlich').optional(),
	position: z.number().int().min(0, 'Position muss eine positive Zahl sein').optional(),
	agent_role_instruction: z.string().nullable().optional()
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
		created_at: row.created_at
	};
}

// GET /api/projects/[id]/statuses/[sid] - Einzelnen Status abrufen
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const projectId = parseInt(params.id);
		const statusId = parseInt(params.sid);
		
		if (isNaN(projectId) || isNaN(statusId)) {
			return json({ ok: false, error: 'Ungültige ID' }, { status: 400 });
		}
		
		const sql = getDb(locals.session.username, locals.session.password);
		
		const [status] = await sql`
			SELECT * FROM board_statuses
			WHERE id = ${statusId} AND project_id = ${projectId}
		`;
		
		if (!status) {
			return json({ ok: false, error: 'Status nicht gefunden' }, { status: 404 });
		}
		
		return json({
			ok: true,
			data: mapBoardStatus(status)
		});
	} catch (error) {
		console.error('GET /api/projects/[id]/statuses/[sid] error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Abrufen des Status' },
			{ status: 500 }
		);
	}
};

// PATCH /api/projects/[id]/statuses/[sid] - Status aktualisieren
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const projectId = parseInt(params.id);
		const statusId = parseInt(params.sid);
		
		if (isNaN(projectId) || isNaN(statusId)) {
			return json({ ok: false, error: 'Ungültige ID' }, { status: 400 });
		}
		
		const body = await request.json();
		const validation = updateStatusSchema.safeParse(body);
		
		if (!validation.success) {
			return json(
				{ ok: false, error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}
		
		const sql = getDb(locals.session.username, locals.session.password);
		
		// Prüfen ob Status existiert
		const [existing] = await sql`
			SELECT * FROM board_statuses
			WHERE id = ${statusId} AND project_id = ${projectId}
		`;

		if (!existing) {
			return json({ ok: false, error: 'Status nicht gefunden' }, { status: 404 });
		}

		const updates: Record<string, unknown> = {};
		if (validation.data.display_name !== undefined) updates.display_name = validation.data.display_name;
		if (validation.data.position !== undefined) updates.position = validation.data.position;
		if (validation.data.agent_role_instruction !== undefined) updates.agent_role_instruction = validation.data.agent_role_instruction;

		if (Object.keys(updates).length === 0) {
			return json({ ok: true, data: mapBoardStatus(existing) });
		}

		const [status] = await sql`
			UPDATE board_statuses SET ${sql(updates)}
			WHERE id = ${statusId} AND project_id = ${projectId}
			RETURNING *
		`;
		
		return json({
			ok: true,
			data: mapBoardStatus(status)
		});
	} catch (error) {
		console.error('PATCH /api/projects/[id]/statuses/[sid] error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Aktualisieren des Status' },
			{ status: 500 }
		);
	}
};

// DELETE /api/projects/[id]/statuses/[sid] - Status löschen
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const projectId = parseInt(params.id);
		const statusId = parseInt(params.sid);
		
		if (isNaN(projectId) || isNaN(statusId)) {
			return json({ ok: false, error: 'Ungültige ID' }, { status: 400 });
		}
		
		const sql = getDb(locals.session.username, locals.session.password);
		
		// Prüfen ob Tickets mit diesem Status existieren
		const [ticketCount] = await sql`
			SELECT COUNT(*) as count FROM tickets
			WHERE status_id = ${statusId}
		`;
		
		if (ticketCount.count > 0) {
			return json(
				{ ok: false, error: `Status kann nicht gelöscht werden, da ${ticketCount.count} Ticket(s) diesen Status verwenden` },
				{ status: 409 }
			);
		}
		
		// Prüfen ob Status existiert
		const [existing] = await sql`
			SELECT id FROM board_statuses
			WHERE id = ${statusId} AND project_id = ${projectId}
		`;
		
		if (!existing) {
			return json({ ok: false, error: 'Status nicht gefunden' }, { status: 404 });
		}
		
		// Status löschen (CASCADE löscht alle abhängigen Transitions)
		await sql`
			DELETE FROM board_statuses
			WHERE id = ${statusId} AND project_id = ${projectId}
		`;
		
		return json({ ok: true });
	} catch (error) {
		console.error('DELETE /api/projects/[id]/statuses/[sid] error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Löschen des Status' },
			{ status: 500 }
		);
	}
};
