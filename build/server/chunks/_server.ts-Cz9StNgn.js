import { j as json } from './index-DcnpJsrC.js';
import { getDb } from './db-hpqnzzJE.js';
import { z } from 'zod';
import 'postgres';

const createTaskSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich")
});
z.object({
  is_completed: z.boolean().optional()
});
const GET = async ({ params, locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const ticketId = parseInt(params.id);
    if (isNaN(ticketId)) {
      return json({ ok: false, error: "Ungültige Ticket-ID" }, { status: 400 });
    }
    const sql = getDb(locals.session.username, locals.session.password);
    const [existing] = await sql`SELECT id FROM tickets WHERE id = ${ticketId}`;
    if (!existing) {
      return json({ ok: false, error: "Ticket nicht gefunden" }, { status: 404 });
    }
    const tasks = await sql`
			SELECT * FROM ticket_tasks
			WHERE ticket_id = ${ticketId}
			ORDER BY created_at ASC
		`;
    return json({
      ok: true,
      data: tasks.map((row) => ({
        id: row.id,
        ticket_id: row.ticket_id,
        title: row.title,
        is_completed: row.is_completed,
        created_at: row.created_at
      }))
    });
  } catch (error) {
    console.error("GET /api/tickets/[id]/tasks error:", error);
    return json(
      { ok: false, error: "Fehler beim Abrufen der Tasks" },
      { status: 500 }
    );
  }
};
const POST = async ({ request, params, locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const ticketId = parseInt(params.id);
    if (isNaN(ticketId)) {
      return json({ ok: false, error: "Ungültige Ticket-ID" }, { status: 400 });
    }
    const body = await request.json();
    const validation = createTaskSchema.safeParse(body);
    if (!validation.success) {
      return json(
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    const { title } = validation.data;
    const sql = getDb(locals.session.username, locals.session.password);
    const [existing] = await sql`SELECT id FROM tickets WHERE id = ${ticketId}`;
    if (!existing) {
      return json({ ok: false, error: "Ticket nicht gefunden" }, { status: 404 });
    }
    const [task] = await sql`
			INSERT INTO ticket_tasks (ticket_id, title, is_completed)
			VALUES (${ticketId}, ${title}, false)
			RETURNING *
		`;
    return json({
      ok: true,
      data: {
        id: task.id,
        ticket_id: task.ticket_id,
        title: task.title,
        is_completed: task.is_completed,
        created_at: task.created_at
      }
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tickets/[id]/tasks error:", error);
    return json(
      { ok: false, error: "Fehler beim Erstellen der Task" },
      { status: 500 }
    );
  }
};

export { GET, POST };
//# sourceMappingURL=_server.ts-Cz9StNgn.js.map
