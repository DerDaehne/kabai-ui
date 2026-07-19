import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

// GET /api/attachments/[id] - Liefert die rohen Bild-Bytes, gedacht als
// direktes <img src="/api/attachments/{id}"> (Ticket #529). Bewusst KEINE
// JSON-Hülle ({ ok, data }) wie sonst in diesem Repo üblich — ein <img>-Tag
// kann keine JSON-Antwort konsumieren, ein 404 ohne Body reicht als Signal,
// das ImageNode.svelte über den onerror-Handler des <img> abfängt.
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return new Response(null, { status: 401 });
	}

	const attachmentId = parseInt(params.id);
	if (isNaN(attachmentId)) {
		return new Response(null, { status: 400 });
	}

	try {
		const sql = getDb(locals.session.username, locals.session.password);

		const [row] = await sql`
			SELECT mime_type, data FROM attachments WHERE id = ${attachmentId}
		`;

		if (!row) {
			return new Response(null, { status: 404 });
		}

		// Attachments werden nach dem Anlegen nie verändert (nur neu hochgeladen)
		// — langlebiges, "immutable" Caching ist daher sicher.
		return new Response(row.data, {
			headers: {
				'Content-Type': row.mime_type,
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} catch (error) {
		console.error('GET /api/attachments/[id] error:', error);
		return new Response(null, { status: 500 });
	}
};
