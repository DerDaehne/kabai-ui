import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';

const createRelationSchema = z.object({
	to_ticket_id: z.number().int().min(1, 'Ziel-Ticket ist erforderlich'),
	relation_type: z.enum(['parent_of', 'blocks', 'duplicate_of', 'relates_to'])
});

// GET /api/tickets/[id]/relations - Alle Relationen abrufen (beide Richtungen)
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

		const [existing] = await sql`SELECT id FROM tickets WHERE id = ${ticketId}`;
		if (!existing) {
			return json({ ok: false, error: 'Ticket nicht gefunden' }, { status: 404 });
		}

		const relations = await sql`
			SELECT r.id, r.from_ticket_id, r.to_ticket_id, r.relation_type, r.created_at,
				t.id AS other_ticket_id, t.title AS other_ticket_title,
				CASE WHEN r.from_ticket_id = ${ticketId} THEN 'outgoing' ELSE 'incoming' END AS direction
			FROM ticket_relations r
			JOIN tickets t ON t.id = (CASE WHEN r.from_ticket_id = ${ticketId} THEN r.to_ticket_id ELSE r.from_ticket_id END)
			WHERE r.from_ticket_id = ${ticketId} OR r.to_ticket_id = ${ticketId}
			ORDER BY r.created_at ASC
		`;

		return json({ ok: true, data: relations });
	} catch (error) {
		console.error('GET /api/tickets/[id]/relations error:', error);
		return json({ ok: false, error: 'Fehler beim Abrufen der Relationen' }, { status: 500 });
	}
};

// POST /api/tickets/[id]/relations - Neue Relation erstellen
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
		const validation = createRelationSchema.safeParse(body);
		if (!validation.success) {
			return json({ ok: false, error: validation.error.errors[0].message }, { status: 400 });
		}

		const { to_ticket_id, relation_type } = validation.data;
		if (to_ticket_id === ticketId) {
			return json({ ok: false, error: 'Ein Ticket kann sich nicht selbst referenzieren' }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [source] = await sql`SELECT id, project_id FROM tickets WHERE id = ${ticketId}`;
		if (!source) {
			return json({ ok: false, error: 'Ticket nicht gefunden' }, { status: 404 });
		}

		const [target] = await sql`SELECT id, title FROM tickets WHERE id = ${to_ticket_id} AND project_id = ${source.project_id}`;
		if (!target) {
			return json({ ok: false, error: 'Ziel-Ticket nicht gefunden oder gehört nicht zum selben Projekt' }, { status: 404 });
		}

		const [relation] = await sql`
			INSERT INTO ticket_relations (from_ticket_id, to_ticket_id, relation_type)
			VALUES (${ticketId}, ${to_ticket_id}, ${relation_type})
			RETURNING *
		`;

		return json({
			ok: true,
			data: {
				...relation,
				other_ticket_id: target.id,
				other_ticket_title: target.title,
				direction: 'outgoing'
			}
		}, { status: 201 });
	} catch (error: any) {
		console.error('POST /api/tickets/[id]/relations error:', error);
		if (error.code === '23505') {
			return json({ ok: false, error: 'Diese Relation existiert bereits' }, { status: 409 });
		}
		if (error.message?.includes('read-only')) {
			return json({ ok: false, error: error.message }, { status: 409 });
		}
		return json({ ok: false, error: 'Fehler beim Erstellen der Relation' }, { status: 500 });
	}
};
