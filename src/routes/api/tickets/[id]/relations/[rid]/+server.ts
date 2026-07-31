import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';

// DELETE /api/tickets/[id]/relations/[rid] - Relation löschen
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const ticketId = parseInt(params.id);
		const relationId = parseInt(params.rid);
		if (isNaN(ticketId) || isNaN(relationId)) {
			return json({ ok: false, error: 'Ungültige ID' }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [existing] = await sql`
			SELECT id FROM ticket_relations
			WHERE id = ${relationId} AND (from_ticket_id = ${ticketId} OR to_ticket_id = ${ticketId})
		`;
		if (!existing) {
			return json({ ok: false, error: 'Relation nicht gefunden' }, { status: 404 });
		}

		await sql`DELETE FROM ticket_relations WHERE id = ${relationId}`;

		return json({ ok: true });
	} catch (error: any) {
		console.error('DELETE /api/tickets/[id]/relations/[rid] error:', error);
		if (error.message?.includes('read-only')) {
			return json({ ok: false, error: error.message }, { status: 409 });
		}
		return json({ ok: false, error: 'Fehler beim Löschen der Relation' }, { status: 500 });
	}
};
