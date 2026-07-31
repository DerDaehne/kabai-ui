import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { Ticket } from '$lib/types';

// Validierungsschemas
const createTicketSchema = z.object({
	title: z.string().min(1, 'Titel ist erforderlich'),
	description: z.string().nullable().optional(),
	status_id: z.number().int().min(1, 'Status-ID ist erforderlich'),
	assignee: z.string().nullable().optional(),
	type: z.enum(['ticket', 'epic']).optional()
});

const querySchema = z.object({
	status_id: z.string().optional(),
	limit: z.string().optional(),
	offset: z.string().optional()
});

// Helper: Ticket aus DB-Row mappen
function mapTicket(row: any): Ticket {
	return {
		id: row.id,
		project_id: row.project_id,
		title: row.title,
		description: row.description,
		status_id: row.status_id,
		assignee: row.assignee,
		model: row.model ?? null,
		type: row.type ?? 'ticket',
		docs_required: row.docs_required ?? false,
		linked_notes_count: row.linked_notes_count !== undefined ? Number(row.linked_notes_count) : undefined,
		epic_children_total: row.epic_children_total !== undefined ? Number(row.epic_children_total) : undefined,
		epic_children_done: row.epic_children_done !== undefined ? Number(row.epic_children_done) : undefined,
		effort_estimate: row.effort_estimate !== null && row.effort_estimate !== undefined ? Number(row.effort_estimate) : null,
		effort_actual: row.effort_actual !== null && row.effort_actual !== undefined ? Number(row.effort_actual) : null,
		effort_unit: row.effort_unit ?? null,
		epic_effort_estimate_sum: row.epic_effort_estimate_sum !== undefined ? Number(row.epic_effort_estimate_sum) : undefined,
		epic_effort_actual_sum: row.epic_effort_actual_sum !== undefined ? Number(row.epic_effort_actual_sum) : undefined,
		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

// GET /api/projects/[id]/tickets - Alle Tickets abrufen
export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const projectId = parseInt(params.id);
		if (isNaN(projectId)) {
			return json({ ok: false, error: 'Ungültige Projekt-ID' }, { status: 400 });
		}
		
		// Query Parameter parsen
		const queryValidation = querySchema.safeParse({
			status_id: url.searchParams.get('status_id'),
			limit: url.searchParams.get('limit'),
			offset: url.searchParams.get('offset')
		});
		
		const queryParams = queryValidation.success ? queryValidation.data : {};
		
		const sql = getDb(locals.session.username, locals.session.password);
		
		const statusIdNum = queryParams.status_id ? parseInt(queryParams.status_id) : NaN;
		const statusFilter = !isNaN(statusIdNum) ? sql`AND status_id = ${statusIdNum}` : sql``;
		// linked_notes_count für Board-Icons (Doku vorhanden / docs_required unerfüllt)
		// epic_children_*: nur für type='epic' > 0 relevant, aber für alle Zeilen
		// mitberechnet — Board-Datensätze pro Projekt sind klein, eine
		// zusätzliche Bedingung auf t.type spart hier keine nennenswerte Zeit.
		const tickets = await sql`
			SELECT t.*,
				(SELECT COUNT(*)::int FROM note_ticket_links ntl WHERE ntl.ticket_id = t.id) AS linked_notes_count,
				(SELECT COUNT(*)::int FROM ticket_relations tr WHERE tr.from_ticket_id = t.id AND tr.relation_type = 'parent_of') AS epic_children_total,
				(SELECT COUNT(*)::int FROM ticket_relations tr
					JOIN tickets c ON c.id = tr.to_ticket_id
					JOIN board_statuses bs ON bs.id = c.status_id
					WHERE tr.from_ticket_id = t.id AND tr.relation_type = 'parent_of' AND bs.name = 'done'
				) AS epic_children_done,
				(SELECT COALESCE(SUM(c.effort_estimate), 0) FROM ticket_relations tr
					JOIN tickets c ON c.id = tr.to_ticket_id
					WHERE tr.from_ticket_id = t.id AND tr.relation_type = 'parent_of'
				) AS epic_effort_estimate_sum,
				(SELECT COALESCE(SUM(c.effort_actual), 0) FROM ticket_relations tr
					JOIN tickets c ON c.id = tr.to_ticket_id
					WHERE tr.from_ticket_id = t.id AND tr.relation_type = 'parent_of'
				) AS epic_effort_actual_sum
			FROM tickets t
			WHERE project_id = ${projectId}
			${statusFilter}
			ORDER BY updated_at DESC
		`;
		
		return json({
			ok: true,
			data: tickets.map(mapTicket)
		});
	} catch (error) {
		console.error('GET /api/projects/[id]/tickets error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Abrufen der Tickets' },
			{ status: 500 }
		);
	}
};

// POST /api/projects/[id]/tickets - Neues Ticket erstellen
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
		const validation = createTicketSchema.safeParse(body);
		
		if (!validation.success) {
			return json(
				{ ok: false, error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}
		
		const { title, description, status_id, assignee, type } = validation.data;
		const sql = getDb(locals.session.username, locals.session.password);

		// Prüfen ob Projekt existiert
		const [existingProject] = await sql`SELECT id FROM projects WHERE id = ${projectId}`;
		if (!existingProject) {
			return json({ ok: false, error: 'Projekt nicht gefunden' }, { status: 404 });
		}

		// Prüfen ob Status existiert und zum Projekt gehört
		const [existingStatus] = await sql`
			SELECT id FROM board_statuses
			WHERE id = ${status_id} AND project_id = ${projectId}
		`;

		if (!existingStatus) {
			return json({ ok: false, error: 'Status nicht gefunden oder gehört nicht zu diesem Projekt' }, { status: 400 });
		}

		const [ticket] = await sql`
			INSERT INTO tickets (project_id, title, description, status_id, assignee, type)
			VALUES (${projectId}, ${title}, ${description}, ${status_id}, ${assignee}, ${type ?? 'ticket'})
			RETURNING *
		`;
		
		return json({
			ok: true,
			data: mapTicket(ticket)
		}, { status: 201 });
	} catch (error: any) {
		console.error('POST /api/projects/[id]/tickets error:', error);

		// Projekt archiviert (Codeberg kbai-ui#7) — DB-Trigger lehnt ab, Meldung 1:1 durchreichen
		if (error.message?.includes('read-only')) {
			return json({ ok: false, error: error.message }, { status: 409 });
		}

		// Trigger-Fehler (Workflow Enforcement)
		if (error.message?.includes('enforce_kanban_workflow_integrity')) {
			return json(
				{ ok: false, error: 'Ungültige Status-Transition. Diese Aktion ist nicht erlaubt.' },
				{ status: 409 }
			);
		}
		
		return json(
			{ ok: false, error: 'Fehler beim Erstellen des Tickets' },
			{ status: 500 }
		);
	}
};
