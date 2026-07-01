import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';

// GET /api/dashboard - Aggregierte Statistiken über alle Projekte
export const GET: RequestHandler = async ({ locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [projectStats, recentTickets] = await Promise.all([
			sql`
				SELECT
					p.id, p.slug, p.name, p.description, p.created_at,
					COUNT(t.id)::int AS ticket_count,
					COUNT(t.id) FILTER (WHERE bs.name = 'done')::int AS done_count,
					COUNT(t.id) FILTER (WHERE bs.special_type = 'human_intervention')::int AS inbox_count
				FROM projects p
				LEFT JOIN tickets t ON t.project_id = p.id
				LEFT JOIN board_statuses bs ON bs.id = t.status_id
				GROUP BY p.id
				ORDER BY p.name ASC
			`,
			sql`
				SELECT t.id, t.title, t.project_id, t.updated_at, p.name AS project_name, bs.display_name AS status_name
				FROM tickets t
				JOIN projects p ON p.id = t.project_id
				LEFT JOIN board_statuses bs ON bs.id = t.status_id
				ORDER BY t.updated_at DESC
				LIMIT 10
			`
		]);

		const totals = projectStats.reduce(
			(acc, p) => ({
				projects: acc.projects + 1,
				tickets: acc.tickets + p.ticket_count,
				done: acc.done + p.done_count,
				inbox: acc.inbox + p.inbox_count
			}),
			{ projects: 0, tickets: 0, done: 0, inbox: 0 }
		);

		return json({
			ok: true,
			data: {
				totals,
				projects: projectStats,
				recentTickets
			}
		});
	} catch (error) {
		console.error('GET /api/dashboard error:', error);
		return json({ ok: false, error: 'Fehler beim Abrufen der Dashboard-Daten' }, { status: 500 });
	}
};
