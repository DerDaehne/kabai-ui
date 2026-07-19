import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RefResolveResult } from '$lib/types';

// Ticket #528: Löst ein 'ref'-Canvas-Element (target_type/target_id) für die
// Anzeige im RefNode auf. Ein fehlendes Ziel (gelöschtes Ticket/Note) ist ein
// erwarteter, gültiger Fall — { exists: false } kommt bewusst mit HTTP 200
// zurück, nicht als Fehler, damit RefNode "weg" (Hinweis-Karte) von "kaputt"
// (Server-/Netzwerkfehler, ok: false) unterscheiden kann.
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { type } = params;
		if (type !== 'ticket' && type !== 'note') {
			return json({ ok: false, error: 'Ungültiger Referenz-Typ' }, { status: 400 });
		}

		const targetId = parseInt(params.id);
		if (isNaN(targetId)) {
			return json({ ok: false, error: 'Ungültige Referenz-ID' }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		if (type === 'ticket') {
			const [row] = await sql`
				SELECT
					t.id, t.title, t.type, t.project_id,
					p.name AS project_name,
					bs.display_name AS status_name
				FROM tickets t
				JOIN projects p ON p.id = t.project_id
				JOIN board_statuses bs ON bs.id = t.status_id
				WHERE t.id = ${targetId}
			`;
			if (!row) {
				const notFound: RefResolveResult = { exists: false };
				return json({ ok: true, data: notFound });
			}
			const result: RefResolveResult = {
				exists: true,
				id: row.id,
				title: row.title,
				type: row.type ?? 'ticket',
				project_id: row.project_id,
				project_name: row.project_name,
				status_name: row.status_name
			};
			return json({ ok: true, data: result });
		}

		// type === 'note': kann 0..n Projekten zugeordnet sein (n:m note_projects,
		// gleiches Muster wie /api/notes) — Namen aggregieren, leeres Array wenn keins.
		const [row] = await sql`
			SELECT
				n.id, n.slug, n.title, n.kind,
				COALESCE(
					json_agg(p.name ORDER BY p.name) FILTER (WHERE p.id IS NOT NULL),
					'[]'
				) AS project_names
			FROM notes n
			LEFT JOIN note_projects np ON np.note_id = n.id
			LEFT JOIN projects p ON p.id = np.project_id
			WHERE n.id = ${targetId}
			GROUP BY n.id
		`;
		if (!row) {
			const notFound: RefResolveResult = { exists: false };
			return json({ ok: true, data: notFound });
		}
		const result: RefResolveResult = {
			exists: true,
			id: row.id,
			slug: row.slug,
			title: row.title,
			kind: row.kind,
			project_names: typeof row.project_names === 'string' ? JSON.parse(row.project_names) : row.project_names
		};
		return json({ ok: true, data: result });
	} catch (error) {
		console.error('GET /api/refs/[type]/[id] error:', error);
		return json({ ok: false, error: 'Fehler beim Auflösen der Referenz' }, { status: 500 });
	}
};
