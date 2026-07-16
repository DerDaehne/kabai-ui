import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';

// GET /api/projects/overview - Unifizierte Projektliste (ex Dashboard + Projekte)
// Liefert pro Projekt: Statusliste mit Ticket-Counts (fürs Tortendiagramm),
// letzte Aktivität, Wartet-auf-Mensch-Zähler, Durchsatz (7 Tage), Alter des
// ältesten offenen Tickets, Notes-Count. Wenige Queries, kein N+1 über Projekte.
export const GET: RequestHandler = async ({ locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [projects, statusCounts, metrics] = await Promise.all([
			// Basis-Projektdaten
			sql`SELECT id, slug, name, description, created_at FROM projects ORDER BY name ASC`,

			// Ticket-Counts je Board-Status (für das Tortendiagramm), ohne
			// Sonderstatus human_intervention/human_answered
			sql`
				SELECT
					bs.project_id, bs.id AS status_id, bs.name, bs.display_name,
					bs.position, bs.special_type,
					COUNT(t.id)::int AS ticket_count
				FROM board_statuses bs
				LEFT JOIN tickets t ON t.status_id = bs.id
				WHERE bs.special_type IS NULL OR bs.special_type NOT IN ('human_intervention', 'human_answered')
				GROUP BY bs.project_id, bs.id, bs.name, bs.display_name, bs.position, bs.special_type
				ORDER BY bs.project_id, bs.position ASC
			`,

			// Aggregierte Metriken pro Projekt: eine Query über GROUP BY,
			// Notes-Count per Sub-Select (note_projects hat kein project_id auf tickets).
			sql`
				SELECT
					p.id AS project_id,
					GREATEST(MAX(t.updated_at), p.created_at) AS last_activity,
					COUNT(t.id) FILTER (WHERE bs.special_type = 'human_intervention')::int AS waiting_on_human,
					COUNT(t.id) FILTER (
						WHERE bs.name = 'done' AND t.updated_at >= NOW() - INTERVAL '7 days'
					)::int AS throughput_7d,
					MIN(t.created_at) FILTER (WHERE bs.name IS DISTINCT FROM 'done') AS oldest_open_created_at,
					(SELECT COUNT(*)::int FROM note_projects np WHERE np.project_id = p.id) AS notes_count
				FROM projects p
				LEFT JOIN tickets t ON t.project_id = p.id
				LEFT JOIN board_statuses bs ON bs.id = t.status_id
				GROUP BY p.id
			`
		]);

		const statusesByProject = new Map<number, any[]>();
		for (const row of statusCounts) {
			const list = statusesByProject.get(row.project_id) ?? [];
			list.push({
				id: row.status_id,
				name: row.name,
				display_name: row.display_name,
				position: row.position,
				special_type: row.special_type ?? null,
				ticket_count: row.ticket_count
			});
			statusesByProject.set(row.project_id, list);
		}

		const metricsByProject = new Map(metrics.map((m: any) => [m.project_id, m]));

		const data = projects.map((p: any) => {
			const m = metricsByProject.get(p.id);
			return {
				id: p.id,
				slug: p.slug,
				name: p.name,
				description: p.description,
				created_at: p.created_at,
				statuses: statusesByProject.get(p.id) ?? [],
				last_activity: m?.last_activity ?? p.created_at,
				waiting_on_human: m?.waiting_on_human ?? 0,
				throughput_7d: m?.throughput_7d ?? 0,
				oldest_open_created_at: m?.oldest_open_created_at ?? null,
				notes_count: m?.notes_count ?? 0
			};
		});

		// Aktivstes Projekt zuerst (last_activity absteigend). NULL-sicher: last_activity
		// fällt oben immer auf p.created_at zurück, ist also nie null/undefined.
		data.sort((a: any, b: any) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());

		return json({ ok: true, data });
	} catch (error) {
		console.error('GET /api/projects/overview error:', error);
		return json({ ok: false, error: 'Fehler beim Abrufen der Projektübersicht' }, { status: 500 });
	}
};
