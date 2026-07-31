import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { Ticket } from '$lib/types';

// Validierungsschemas
const updateTicketSchema = z.object({
	title: z.string().min(1, 'Titel ist erforderlich').optional(),
	description: z.string().nullable().optional(),
	assignee: z.string().nullable().optional(),
	model: z.string().nullable().optional(),
	status_id: z.number().int().min(1, 'Status-ID ist erforderlich').optional(),
	type: z.enum(['ticket', 'epic']).optional(),
	effort_estimate: z.number().nullable().optional(),
	effort_actual: z.number().nullable().optional(),
	effort_unit: z.string().nullable().optional()
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
		effort_estimate: row.effort_estimate !== null && row.effort_estimate !== undefined ? Number(row.effort_estimate) : null,
		effort_actual: row.effort_actual !== null && row.effort_actual !== undefined ? Number(row.effort_actual) : null,
		effort_unit: row.effort_unit ?? null,
		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

// GET /api/tickets/[id] - Einzelnes Ticket abrufen
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const ticketId = parseInt(params.id);
		if (isNaN(ticketId)) {
			return json({ ok: false, error: 'Ungültige Ticket-ID' }, { status: 400 });
		}
		
		const sql = getDb(locals.session.username, locals.session.password);
		
		// Ticket abrufen
		const [ticket] = await sql`SELECT * FROM tickets WHERE id = ${ticketId}`;
		
		if (!ticket) {
			return json({ ok: false, error: 'Ticket nicht gefunden' }, { status: 404 });
		}
		
		// Status-Informationen abrufen
		const [status] = await sql`
			SELECT * FROM board_statuses
			WHERE id = ${ticket.status_id}
		`;
		
		// Tasks abrufen
		const tasks = await sql`
			SELECT * FROM ticket_tasks
			WHERE ticket_id = ${ticketId}
			ORDER BY created_at ASC
		`;
		
		// Kommentare abrufen
		const comments = await sql`
			SELECT * FROM ticket_comments
			WHERE ticket_id = ${ticketId}
			ORDER BY created_at ASC
		`;

		// Relationen abrufen (beide Richtungen, mit Titel des jeweils anderen Tickets)
		const relations = await sql`
			SELECT r.id, r.from_ticket_id, r.to_ticket_id, r.relation_type, r.created_at,
				t.id AS other_ticket_id, t.title AS other_ticket_title,
				CASE WHEN r.from_ticket_id = ${ticketId} THEN 'outgoing' ELSE 'incoming' END AS direction
			FROM ticket_relations r
			JOIN tickets t ON t.id = (CASE WHEN r.from_ticket_id = ${ticketId} THEN r.to_ticket_id ELSE r.from_ticket_id END)
			WHERE r.from_ticket_id = ${ticketId} OR r.to_ticket_id = ${ticketId}
			ORDER BY r.created_at ASC
		`;

		// Verlinkte Knowledge-Base-Notes (note_ticket_links, V7)
		const linkedNotes = await sql`
			SELECT ntl.note_id, ntl.relation, n.slug, n.title, n.kind, n.archived
			FROM note_ticket_links ntl
			JOIN notes n ON n.id = ntl.note_id
			WHERE ntl.ticket_id = ${ticketId}
			ORDER BY ntl.relation, n.title
		`;

		return json({
			ok: true,
			data: {
				ticket: mapTicket(ticket),
				status: status || null,
				tasks: tasks.map((row: any) => ({
					id: row.id,
					ticket_id: row.ticket_id,
					title: row.title,
					is_completed: row.is_completed,
					created_at: row.created_at
				})),
				comments: comments.map((row: any) => ({
					id: row.id,
					ticket_id: row.ticket_id,
					author: row.author,
					comment_text: row.comment_text,
					created_at: row.created_at
				})),
				relations: relations.map((row: any) => ({
					id: row.id,
					from_ticket_id: row.from_ticket_id,
					to_ticket_id: row.to_ticket_id,
					relation_type: row.relation_type,
					created_at: row.created_at,
					other_ticket_id: row.other_ticket_id,
					other_ticket_title: row.other_ticket_title,
					direction: row.direction
				})),
				linked_notes: linkedNotes.map((row: any) => ({
					note_id: row.note_id,
					slug: row.slug,
					title: row.title,
					kind: row.kind,
					relation: row.relation,
					archived: row.archived
				}))
			}
		});
	} catch (error) {
		console.error('GET /api/tickets/[id] error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Abrufen des Tickets' },
			{ status: 500 }
		);
	}
};

// PATCH /api/tickets/[id] - Ticket aktualisieren
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const ticketId = parseInt(params.id);
		if (isNaN(ticketId)) {
			return json({ ok: false, error: 'Ungültige Ticket-ID' }, { status: 400 });
		}
		
		const body = await request.json();
		const validation = updateTicketSchema.safeParse(body);
		
		if (!validation.success) {
			return json(
				{ ok: false, error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}
		
		const sql = getDb(locals.session.username, locals.session.password);
		
		// Prüfen ob Ticket existiert
		const [existing] = await sql`SELECT * FROM tickets WHERE id = ${ticketId}`;
		if (!existing) {
			return json({ ok: false, error: 'Ticket nicht gefunden' }, { status: 404 });
		}
		
		// Wenn status_id geändert wird, prüfen ob Transition erlaubt ist
		if (validation.data.status_id !== undefined && validation.data.status_id !== existing.status_id) {
			// Prüfen ob Transition existiert
			const [transition] = await sql`
				SELECT * FROM status_transitions
				WHERE project_id = ${existing.project_id} 
				AND from_status_id = ${existing.status_id}
				AND to_status_id = ${validation.data.status_id}
			`;
			
			if (!transition) {
				return json(
					{ ok: false, error: 'Ungültige Status-Transition. Diese Aktion ist nicht erlaubt.' },
					{ status: 409 }
				);
			}
			
			// Prüfen ob alle Tasks abgeschlossen sind, wenn nach 'done' verschoben wird
			const statuses = await sql`SELECT name FROM board_statuses WHERE id = ${validation.data.status_id}`;
			const toStatusName = statuses[0]?.name;
			
			if (toStatusName === 'done') {
				const [incompleteTasks] = await sql`
					SELECT COUNT(*) as count FROM ticket_tasks
					WHERE ticket_id = ${ticketId} AND is_completed = false
				`;
				
				if (incompleteTasks.count > 0) {
					return json(
						{ ok: false, error: 'Alle Tasks müssen abgeschlossen sein, bevor das Ticket als "done" markiert werden kann.' },
						{ status: 409 }
					);
				}
			}
		}
		
		const updates: Record<string, unknown> = {};
		if (validation.data.title !== undefined) updates.title = validation.data.title;
		if (validation.data.description !== undefined) updates.description = validation.data.description;
		if (validation.data.assignee !== undefined) updates.assignee = validation.data.assignee;
		if (validation.data.model !== undefined) updates.model = validation.data.model;
		if (validation.data.status_id !== undefined) updates.status_id = validation.data.status_id;
		if (validation.data.type !== undefined) updates.type = validation.data.type;
		if (validation.data.effort_estimate !== undefined) updates.effort_estimate = validation.data.effort_estimate;
		if (validation.data.effort_actual !== undefined) updates.effort_actual = validation.data.effort_actual;
		if (validation.data.effort_unit !== undefined) updates.effort_unit = validation.data.effort_unit;

		if (Object.keys(updates).length === 0) {
			return json({ ok: true, data: mapTicket(existing) });
		}

		const [ticket] = await sql`
			UPDATE tickets SET ${sql(updates)} WHERE id = ${ticketId} RETURNING *
		`;
		
		return json({
			ok: true,
			data: mapTicket(ticket)
		});
	} catch (error: any) {
		console.error('PATCH /api/tickets/[id] error:', error);
		
		// Trigger-Fehler
		if (error.message?.includes('enforce_kanban_workflow_integrity')) {
			return json(
				{ ok: false, error: 'Ungültige Status-Transition. Diese Aktion ist nicht erlaubt.' },
				{ status: 409 }
			);
		}
		
		return json(
			{ ok: false, error: 'Fehler beim Aktualisieren des Tickets' },
			{ status: 500 }
		);
	}
};

// DELETE /api/tickets/[id] - Ticket löschen
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const ticketId = parseInt(params.id);
		if (isNaN(ticketId)) {
			return json({ ok: false, error: 'Ungültige Ticket-ID' }, { status: 400 });
		}
		
		const sql = getDb(locals.session.username, locals.session.password);
		
		// Prüfen ob Ticket existiert
		const [existing] = await sql`SELECT id FROM tickets WHERE id = ${ticketId}`;
		if (!existing) {
			return json({ ok: false, error: 'Ticket nicht gefunden' }, { status: 404 });
		}
		
		// Ticket löschen (CASCADE löscht alle abhängigen Tasks und Kommentare)
		await sql`DELETE FROM tickets WHERE id = ${ticketId}`;
		
		return json({ ok: true });
	} catch (error) {
		console.error('DELETE /api/tickets/[id] error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Löschen des Tickets' },
			{ status: 500 }
		);
	}
};
