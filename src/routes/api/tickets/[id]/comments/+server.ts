import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';

// Validierungsschema
const createCommentSchema = z.object({
	author: z.string().min(1, 'Autor ist erforderlich'),
	comment_text: z.string().min(1, 'Kommentar-Text ist erforderlich')
});

// GET /api/tickets/[id]/comments - Alle Kommentare abrufen
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
		
		const comments = await sql`
			SELECT * FROM ticket_comments
			WHERE ticket_id = ${ticketId}
			ORDER BY created_at ASC
		`;
		
		return json({
			ok: true,
			data: comments.map((row: any) => ({
				id: row.id,
				ticket_id: row.ticket_id,
				author: row.author,
				comment_text: row.comment_text,
				created_at: row.created_at
			}))
		});
	} catch (error) {
		console.error('GET /api/tickets/[id]/comments error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Abrufen der Kommentare' },
			{ status: 500 }
		);
	}
};

// POST /api/tickets/[id]/comments - Neuen Kommentar erstellen
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
		const validation = createCommentSchema.safeParse(body);
		
		if (!validation.success) {
			return json(
				{ ok: false, error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}
		
		const { author, comment_text } = validation.data;
		const sql = getDb(locals.session.username, locals.session.password);
		
		// Prüfen ob Ticket existiert
		const [existing] = await sql`SELECT id FROM tickets WHERE id = ${ticketId}`;
		if (!existing) {
			return json({ ok: false, error: 'Ticket nicht gefunden' }, { status: 404 });
		}
		
		const [comment] = await sql`
			INSERT INTO ticket_comments (ticket_id, author, comment_text)
			VALUES (${ticketId}, ${author}, ${comment_text})
			RETURNING *
		`;
		
		return json({
			ok: true,
			data: {
				id: comment.id,
				ticket_id: comment.ticket_id,
				author: comment.author,
				comment_text: comment.comment_text,
				created_at: comment.created_at
			}
		}, { status: 201 });
	} catch (error) {
		console.error('POST /api/tickets/[id]/comments error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Erstellen des Kommentars' },
			{ status: 500 }
		);
	}
};
