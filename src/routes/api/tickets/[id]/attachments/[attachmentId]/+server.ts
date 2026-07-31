import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';

// DELETE /api/tickets/[id]/attachments/[attachmentId] - Verknüpfung lösen.
// Löscht bewusst NUR die ticket_attachments-Zeile, nicht das Attachment
// selbst — Orphan-GC ist laut ADR-004 eine akzeptierte Konsequenz (kein
// Löschpfad für die attachments-Tabelle in diesem Ticket-Scope).
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const ticketId = parseInt(params.id);
		const attachmentId = parseInt(params.attachmentId);
		if (isNaN(ticketId) || isNaN(attachmentId)) {
			return json({ ok: false, error: 'Ungültige ID' }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [deleted] = await sql`
			DELETE FROM ticket_attachments
			WHERE ticket_id = ${ticketId} AND attachment_id = ${attachmentId}
			RETURNING attachment_id
		`;

		if (!deleted) {
			return json({ ok: false, error: 'Verknüpfung nicht gefunden' }, { status: 404 });
		}

		return json({ ok: true });
	} catch (error) {
		console.error('DELETE /api/tickets/[id]/attachments/[attachmentId] error:', error);
		return json({ ok: false, error: 'Fehler beim Entfernen des Anhangs' }, { status: 500 });
	}
};
