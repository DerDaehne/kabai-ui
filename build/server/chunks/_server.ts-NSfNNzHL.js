import { j as json } from './index-DcnpJsrC.js';
import { getDb } from './db-hpqnzzJE.js';
import 'postgres';

const DELETE = async ({ params, locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const projectId = parseInt(params.id);
    const fromStatusId = parseInt(params.from);
    const toStatusId = parseInt(params.to);
    if (isNaN(projectId) || isNaN(fromStatusId) || isNaN(toStatusId)) {
      return json({ ok: false, error: "Ungültige ID" }, { status: 400 });
    }
    const sql = getDb(locals.session.username, locals.session.password);
    const [existing] = await sql`
			SELECT * FROM status_transitions
			WHERE project_id = ${projectId} 
			AND from_status_id = ${fromStatusId}
			AND to_status_id = ${toStatusId}
		`;
    if (!existing) {
      return json({ ok: false, error: "Transition nicht gefunden" }, { status: 404 });
    }
    await sql`
			DELETE FROM status_transitions
			WHERE project_id = ${projectId} 
			AND from_status_id = ${fromStatusId}
			AND to_status_id = ${toStatusId}
		`;
    return json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]/transitions/[from]/[to] error:", error);
    return json(
      { ok: false, error: "Fehler beim Löschen der Transition" },
      { status: 500 }
    );
  }
};

export { DELETE };
//# sourceMappingURL=_server.ts-NSfNNzHL.js.map
