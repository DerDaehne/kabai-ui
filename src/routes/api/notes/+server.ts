import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { NoteSummary } from '$lib/types';

// Helper: Note aus DB-Row mappen
function mapNote(row: any): NoteSummary {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		kind: row.kind,
		tags: row.tags ?? [],
		archived: row.archived,
		created_at: row.created_at,
		updated_at: row.updated_at,
		last_verified_at: row.last_verified_at,
		last_verified_ticket_id: row.last_verified_ticket_id,
		projects: typeof row.projects === 'string' ? JSON.parse(row.projects) : (row.projects ?? []),
		...(row.snippet !== undefined ? { snippet: row.snippet } : {}),
		...(row.rank !== undefined ? { rank: Number(row.rank) } : {})
	};
}

// GET /api/notes - Knowledge-Base-Notes mit Suche und Filtern
// Query-Params: q (Freitext), kind (note|adr|hub), tag, project ("all" | "none" | ID),
// archived=true (archivierte einblenden)
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const q = url.searchParams.get('q')?.trim() || '';
		const kind = url.searchParams.get('kind') || '';
		const tag = url.searchParams.get('tag') || '';
		const project = url.searchParams.get('project') || 'all';
		const includeArchived = url.searchParams.get('archived') === 'true';

		if (kind && !['note', 'adr', 'hub'].includes(kind)) {
			return json({ ok: false, error: 'Ungültiger kind-Filter' }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		// Filter-Fragmente (postgres.js erlaubt verschachtelte sql``-Fragmente)
		const archivedCond = includeArchived ? sql`TRUE` : sql`n.archived = FALSE`;
		const kindCond = kind ? sql`n.kind = ${kind}` : sql`TRUE`;
		const tagCond = tag ? sql`${tag} = ANY(n.tags)` : sql`TRUE`;
		const projectCond =
			project === 'none'
				? sql`NOT EXISTS (SELECT 1 FROM note_projects np2 WHERE np2.note_id = n.id)`
				: project !== 'all' && /^\d+$/.test(project)
					? sql`EXISTS (SELECT 1 FROM note_projects np2 WHERE np2.note_id = n.id AND np2.project_id = ${parseInt(project)})`
					: sql`TRUE`;

		const baseSelect = sql`
			n.id, n.slug, n.title, n.kind, n.tags, n.archived,
			n.created_at, n.updated_at, n.last_verified_at, n.last_verified_ticket_id,
			COALESCE(
				json_agg(json_build_object('id', p.id, 'name', p.name) ORDER BY p.name)
					FILTER (WHERE p.id IS NOT NULL),
				'[]'
			) AS projects
		`;
		const baseJoin = sql`
			FROM notes n
			LEFT JOIN note_projects np ON np.note_id = n.id
			LEFT JOIN projects p ON p.id = np.project_id
		`;

		let notes;
		let fuzzyFallback = false;

		if (q) {
			// FTS: websearch_to_tsquery gegen die generierte search_tsv-Spalte,
			// Ranking + Headline-Snippet (Muster aus src/docs/docs_tools.c im kb.ai-Repo)
			notes = await sql`
				SELECT ${baseSelect},
					ts_rank(n.search_tsv, websearch_to_tsquery('simple', ${q})) AS rank,
					ts_headline('simple', n.body, websearch_to_tsquery('simple', ${q}),
						'MaxWords=30, MinWords=10, StartSel=<mark>, StopSel=</mark>') AS snippet
				${baseJoin}
				WHERE n.search_tsv @@ websearch_to_tsquery('simple', ${q})
					AND ${archivedCond} AND ${kindCond} AND ${tagCond} AND ${projectCond}
				GROUP BY n.id
				ORDER BY rank DESC, n.updated_at DESC
			`;

			// 0 FTS-Treffer → pg_trgm-Fallback auf den Titel (Tippfehler-Toleranz)
			if (notes.length === 0) {
				fuzzyFallback = true;
				notes = await sql`
					SELECT ${baseSelect},
						similarity(n.title, ${q}) AS rank
					${baseJoin}
					WHERE n.title % ${q}
						AND ${archivedCond} AND ${kindCond} AND ${tagCond} AND ${projectCond}
					GROUP BY n.id
					ORDER BY rank DESC, n.updated_at DESC
				`;
			}
		} else {
			notes = await sql`
				SELECT ${baseSelect}
				${baseJoin}
				WHERE ${archivedCond} AND ${kindCond} AND ${tagCond} AND ${projectCond}
				GROUP BY n.id
				ORDER BY n.updated_at DESC
			`;
		}

		// Alle bekannten Tags für den Filter-Dropdown (unabhängig vom aktiven Filter)
		const tagRows = await sql`
			SELECT DISTINCT unnest(tags) AS tag FROM notes
			${includeArchived ? sql`` : sql`WHERE archived = FALSE`}
			ORDER BY 1
		`;

		return json({
			ok: true,
			data: {
				notes: notes.map(mapNote),
				tags: tagRows.map((r: any) => r.tag),
				fuzzy_fallback: fuzzyFallback
			}
		});
	} catch (error) {
		console.error('GET /api/notes error:', error);
		return json({ ok: false, error: 'Fehler beim Abrufen der Knowledge Base' }, { status: 500 });
	}
};
