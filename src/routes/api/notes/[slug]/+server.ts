import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { NoteDetail } from '$lib/types';

// GET /api/notes/[slug] - Eine Note mit Body, Link-Nachbarschaft und Ticket-Links
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [note] = await sql`
			SELECT n.id, n.slug, n.title, n.kind, n.body, n.tags, n.archived,
				n.created_at, n.updated_at, n.last_verified_at, n.last_verified_ticket_id,
				COALESCE(
					json_agg(json_build_object('id', p.id, 'name', p.name) ORDER BY p.name)
						FILTER (WHERE p.id IS NOT NULL),
					'[]'
				) AS projects
			FROM notes n
			LEFT JOIN note_projects np ON np.note_id = n.id
			LEFT JOIN projects p ON p.id = np.project_id
			WHERE n.slug = ${params.slug!}
			GROUP BY n.id
		`;

		if (!note) {
			return json({ ok: false, error: 'Note nicht gefunden' }, { status: 404 });
		}

		// Link-Nachbarschaft: aus- und eingehende note_links mit Metadaten der Gegenseite
		const links = await sql`
			SELECT 'outgoing' AS direction, l.link_type,
				t.id AS note_id, t.slug, t.title, t.kind, t.archived
			FROM note_links l JOIN notes t ON t.id = l.to_note_id
			WHERE l.from_note_id = ${note.id}
			UNION ALL
			SELECT 'incoming' AS direction, l.link_type,
				f.id AS note_id, f.slug, f.title, f.kind, f.archived
			FROM note_links l JOIN notes f ON f.id = l.from_note_id
			WHERE l.to_note_id = ${note.id}
			ORDER BY link_type, title
		`;

		const ticketLinks = await sql`
			SELECT ntl.ticket_id, ntl.relation, t.title AS ticket_title, t.project_id
			FROM note_ticket_links ntl
			JOIN tickets t ON t.id = ntl.ticket_id
			WHERE ntl.note_id = ${note.id}
			ORDER BY ntl.relation, ntl.ticket_id
		`;

		const data: NoteDetail = {
			id: note.id,
			slug: note.slug,
			title: note.title,
			kind: note.kind,
			body: note.body,
			tags: note.tags ?? [],
			archived: note.archived,
			created_at: note.created_at,
			updated_at: note.updated_at,
			last_verified_at: note.last_verified_at,
			last_verified_ticket_id: note.last_verified_ticket_id,
			projects: typeof note.projects === 'string' ? JSON.parse(note.projects) : note.projects,
			links: links.map((l: any) => ({
				direction: l.direction,
				link_type: l.link_type,
				note_id: l.note_id,
				slug: l.slug,
				title: l.title,
				kind: l.kind,
				archived: l.archived
			})),
			ticket_links: ticketLinks.map((tl: any) => ({
				ticket_id: tl.ticket_id,
				relation: tl.relation,
				ticket_title: tl.ticket_title,
				project_id: tl.project_id
			}))
		};

		return json({ ok: true, data });
	} catch (error) {
		console.error(`GET /api/notes/${params.slug} error:`, error);
		return json({ ok: false, error: 'Fehler beim Abrufen der Note' }, { status: 500 });
	}
};

// PATCH /api/notes/[slug] - Archivieren/Reaktivieren (kein Hard-Delete, siehe
// kabai golden rule "Archive, don't delete" — Historie bleibt erhalten)
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		if (typeof body.archived !== 'boolean') {
			return json({ ok: false, error: '"archived" muss ein boolean sein' }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [note] = await sql`
			UPDATE notes SET archived = ${body.archived}
			WHERE slug = ${params.slug!}
			RETURNING id, slug, archived
		`;

		if (!note) {
			return json({ ok: false, error: 'Note nicht gefunden' }, { status: 404 });
		}

		return json({ ok: true, data: note });
	} catch (error) {
		console.error(`PATCH /api/notes/${params.slug} error:`, error);
		return json({ ok: false, error: 'Fehler beim Aktualisieren der Note' }, { status: 500 });
	}
};
