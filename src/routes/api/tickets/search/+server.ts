import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { TicketSearchResult } from '$lib/types';

// Ticket #528: Projektübergreifende Ticket/Epic-Suche für den
// RefPickerDialog des Canvas-Editors. Liegt bewusst NEBEN /api/tickets/[id]
// (statischer "search"-Segment-Name wird von SvelteKit vor dem dynamischen
// [id]-Parameter aufgelöst — kein Routing-Konflikt).
function mapResult(row: any): TicketSearchResult {
	return {
		id: row.id,
		title: row.title,
		type: row.type ?? 'ticket',
		project_id: row.project_id,
		project_name: row.project_name,
		status_id: row.status_id,
		status_name: row.status_name
	};
}

// GET /api/tickets/search?q=... - Tickets/Epics aller Projekte per Titel-Suche
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const q = url.searchParams.get('q')?.trim() || '';
		if (!q) {
			return json({ ok: true, data: [] });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const rows = await sql`
			SELECT
				t.id, t.title, t.type, t.project_id,
				p.name AS project_name,
				t.status_id,
				bs.display_name AS status_name
			FROM tickets t
			JOIN projects p ON p.id = t.project_id
			JOIN board_statuses bs ON bs.id = t.status_id
			WHERE t.title ILIKE ${'%' + q + '%'}
			ORDER BY t.updated_at DESC
			LIMIT 20
		`;

		return json({ ok: true, data: rows.map(mapResult) });
	} catch (error) {
		console.error('GET /api/tickets/search error:', error);
		return json({ ok: false, error: 'Fehler bei der Ticket-Suche' }, { status: 500 });
	}
};
