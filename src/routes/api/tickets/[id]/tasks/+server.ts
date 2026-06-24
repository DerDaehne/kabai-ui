import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';

// Validierungsschemas
const createTaskSchema = z.object({
	title: z.string().min(1, 'Titel ist erforderlich')
});

const updateTaskSchema = z.object({
	is_completed: z.boolean().optional()
});

// GET /api/tickets/[id]/tasks - Alle Tasks abrufen
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
		
		// Prüfen ob Ticket existiert
		const [existing] = await sql`SELECT id FROM tickets WHERE id = ${ticketId}`;
		if (!existing) {
			return json({ ok: false, error: 'Ticket nicht gefunden' }, { status: 404 });
		}
		
		const tasks = await sql`
			SELECT * FROM ticket_tasks
			WHERE ticket_id = ${ticketId}
			ORDER BY created_at ASC
		`;
		
		return json({
			ok: true,
			data: tasks.map((row: any) => ({
				id: row.id,
				ticket_id: row.ticket_id,
				title: row.title,
				is_completed: row.is_completed,
				created_at: row.created_at
			}))
		});
	} catch (error) {
		console.error('GET /api/tickets/[id]/tasks error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Abrufen der Tasks' },
			{ status: 500 }
		);
	}
};

// POST /api/tickets/[id]/tasks - Neue Task erstellen
export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const ticketId = parseInt(params.id);
		if (isNaN(ticketId)) {
			return json({ ok: false, error: 'Ungültige Ticket-ID' }, { status: 400 });
		}
		
		const body = await request.json();
		const validation = createTaskSchema.safeParse(body);
		
		if (!validation.success) {
			return json(
				{ ok: false, error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}
		
		const { title } = validation.data;
		const sql = getDb(locals.session.username, locals.session.password);
		
		// Prüfen ob Ticket existiert
		const [existing] = await sql`SELECT id FROM tickets WHERE id = ${ticketId}`;
		if (!existing) {
			return json({ ok: false, error: 'Ticket nicht gefunden' }, { status: 404 });
		}
		
		const [task] = await sql`
			INSERT INTO ticket_tasks (ticket_id, title, is_completed)
			VALUES (${ticketId}, ${title}, false)
			RETURNING *
		`;
		
		return json({
			ok: true,
			data: {
				id: task.id,
				ticket_id: task.ticket_id,
				title: task.title,
				is_completed: task.is_completed,
				created_at: task.created_at
			}
		}, { status: 201 });
	} catch (error) {
		console.error('POST /api/tickets/[id]/tasks error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Erstellen der Task' },
			{ status: 500 }
		);
	}
};
