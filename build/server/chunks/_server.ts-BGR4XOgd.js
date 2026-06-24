import { j as json } from './index-DcnpJsrC.js';
import { getDb } from './db-hpqnzzJE.js';
import { z } from 'zod';
import 'postgres';

const createTicketSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  description: z.string().nullable().optional(),
  status_id: z.number().int().min(1, "Status-ID ist erforderlich"),
  assignee: z.string().nullable().optional()
});
const querySchema = z.object({
  status_id: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional()
});
function mapTicket(row) {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    description: row.description,
    status_id: row.status_id,
    assignee: row.assignee,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
const GET = async ({ params, url, locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return json({ ok: false, error: "Ungültige Projekt-ID" }, { status: 400 });
    }
    const queryValidation = querySchema.safeParse({
      status_id: url.searchParams.get("status_id"),
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset")
    });
    const queryParams = queryValidation.success ? queryValidation.data : {};
    const sql = getDb(locals.session.username, locals.session.password);
    let query = sql`
			SELECT * FROM tickets
			WHERE project_id = ${projectId}
		`;
    if (queryParams.status_id) {
      const statusId = parseInt(queryParams.status_id);
      if (!isNaN(statusId)) {
        query = query.append(sql`AND status_id = ${statusId}`);
      }
    }
    const tickets = await query.append(sql`ORDER BY updated_at DESC`);
    return json({
      ok: true,
      data: tickets.map(mapTicket)
    });
  } catch (error) {
    console.error("GET /api/projects/[id]/tickets error:", error);
    return json(
      { ok: false, error: "Fehler beim Abrufen der Tickets" },
      { status: 500 }
    );
  }
};
const POST = async ({ request, params, locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return json({ ok: false, error: "Ungültige Projekt-ID" }, { status: 400 });
    }
    const body = await request.json();
    const validation = createTicketSchema.safeParse(body);
    if (!validation.success) {
      return json(
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    const { title, description, status_id, assignee } = validation.data;
    const sql = getDb(locals.session.username, locals.session.password);
    const [existingProject] = await sql`SELECT id FROM projects WHERE id = ${projectId}`;
    if (!existingProject) {
      return json({ ok: false, error: "Projekt nicht gefunden" }, { status: 404 });
    }
    const [existingStatus] = await sql`
			SELECT id FROM board_statuses
			WHERE id = ${status_id} AND project_id = ${projectId}
		`;
    if (!existingStatus) {
      return json({ ok: false, error: "Status nicht gefunden oder gehört nicht zu diesem Projekt" }, { status: 400 });
    }
    const [ticket] = await sql`
			INSERT INTO tickets (project_id, title, description, status_id, assignee)
			VALUES (${projectId}, ${title}, ${description}, ${status_id}, ${assignee})
			RETURNING *
		`;
    return json({
      ok: true,
      data: mapTicket(ticket)
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/tickets error:", error);
    if (error.message?.includes("enforce_kanban_workflow_integrity")) {
      return json(
        { ok: false, error: "Ungültige Status-Transition. Diese Aktion ist nicht erlaubt." },
        { status: 409 }
      );
    }
    return json(
      { ok: false, error: "Fehler beim Erstellen des Tickets" },
      { status: 500 }
    );
  }
};

export { GET, POST };
//# sourceMappingURL=_server.ts-BGR4XOgd.js.map
