import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';

// GET /api/tickets/[id]/attachments - Metadaten aller angehängten Bilder
// (nie die Binärdaten — die liefert GET /api/attachments/[id] fürs <img src>)
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

		const rows = await sql`
			SELECT a.id, a.filename, a.mime_type, a.size_bytes, a.description, a.uploaded_by, a.created_at
			FROM ticket_attachments ta
			JOIN attachments a ON a.id = ta.attachment_id
			WHERE ta.ticket_id = ${ticketId}
			ORDER BY ta.created_at ASC
		`;

		return json({ ok: true, data: rows });
	} catch (error) {
		console.error('GET /api/tickets/[id]/attachments error:', error);
		return json({ ok: false, error: 'Fehler beim Abrufen der Anhänge' }, { status: 500 });
	}
};

const linkSchema = z.object({
	attachment_id: z.number().int().positive()
});

// POST /api/tickets/[id]/attachments - Bereits hochgeladenes Attachment
// (POST /api/attachments) an dieses Ticket hängen — zweistufig wie beim
// Canvas-Bild-Upload (#529): erst Datei hochladen, dann verknüpfen.
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
		const validation = linkSchema.safeParse(body);
		if (!validation.success) {
			return json({ ok: false, error: validation.error.errors[0].message }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [ticket] = await sql`SELECT id FROM tickets WHERE id = ${ticketId}`;
		if (!ticket) {
			return json({ ok: false, error: 'Ticket nicht gefunden' }, { status: 404 });
		}

		const [attachment] = await sql`
			INSERT INTO ticket_attachments (ticket_id, attachment_id)
			VALUES (${ticketId}, ${validation.data.attachment_id})
			ON CONFLICT (ticket_id, attachment_id) DO NOTHING
			RETURNING attachment_id
		`;

		const [row] = await sql`
			SELECT id, filename, mime_type, size_bytes, description, uploaded_by, created_at
			FROM attachments WHERE id = ${validation.data.attachment_id}
		`;

		if (!row) {
			return json({ ok: false, error: 'Attachment nicht gefunden' }, { status: 404 });
		}

		return json({ ok: true, data: row }, { status: attachment ? 201 : 200 });
	} catch (error: any) {
		console.error('POST /api/tickets/[id]/attachments error:', error);
		if (error.message?.includes('foreign key constraint')) {
			return json({ ok: false, error: 'Attachment existiert nicht' }, { status: 400 });
		}
		return json({ ok: false, error: 'Fehler beim Verknüpfen des Anhangs' }, { status: 500 });
	}
};
