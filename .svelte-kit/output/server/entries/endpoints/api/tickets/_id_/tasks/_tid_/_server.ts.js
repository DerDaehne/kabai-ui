import { json } from "@sveltejs/kit";
import { getDb } from "../../../../../../../chunks/db.js";
import { z } from "zod";
const updateTaskSchema = z.object({
  is_completed: z.boolean().optional()
});
const PATCH = async ({ request, params, locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const taskId = parseInt(params.tid);
    if (isNaN(taskId)) {
      return json({ ok: false, error: "Ungültige Task-ID" }, { status: 400 });
    }
    const body = await request.json();
    const validation = updateTaskSchema.safeParse(body);
    if (!validation.success) {
      return json(
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    const sql = getDb(locals.session.username, locals.session.password);
    const [existing] = await sql`SELECT * FROM ticket_tasks WHERE id = ${taskId}`;
    if (!existing) {
      return json({ ok: false, error: "Task nicht gefunden" }, { status: 404 });
    }
    const [task] = await sql`
			UPDATE ticket_tasks
			SET is_completed = ${validation.data.is_completed || existing.is_completed}
			WHERE id = ${taskId}
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
    });
  } catch (error) {
    console.error("PATCH /api/tasks/[tid] error:", error);
    return json(
      { ok: false, error: "Fehler beim Aktualisieren der Task" },
      { status: 500 }
    );
  }
};
const DELETE = async ({ params, locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const taskId = parseInt(params.tid);
    if (isNaN(taskId)) {
      return json({ ok: false, error: "Ungültige Task-ID" }, { status: 400 });
    }
    const sql = getDb(locals.session.username, locals.session.password);
    const [existing] = await sql`SELECT id FROM ticket_tasks WHERE id = ${taskId}`;
    if (!existing) {
      return json({ ok: false, error: "Task nicht gefunden" }, { status: 404 });
    }
    await sql`DELETE FROM ticket_tasks WHERE id = ${taskId}`;
    return json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[tid] error:", error);
    return json(
      { ok: false, error: "Fehler beim Löschen der Task" },
      { status: 500 }
    );
  }
};
export {
  DELETE,
  PATCH
};
