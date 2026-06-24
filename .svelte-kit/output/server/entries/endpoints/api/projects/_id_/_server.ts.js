import { json } from "@sveltejs/kit";
import { getDb } from "../../../../../chunks/db.js";
import { z } from "zod";
const updateProjectSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").optional(),
  description: z.string().nullable().optional()
});
function mapProject(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    created_at: row.created_at
  };
}
const GET = async ({ params, locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const sql = getDb(locals.session.username, locals.session.password);
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return json({ ok: false, error: "Ungültige Projekt-ID" }, { status: 400 });
    }
    const [project] = await sql`SELECT * FROM projects WHERE id = ${projectId}`;
    if (!project) {
      return json({ ok: false, error: "Projekt nicht gefunden" }, { status: 404 });
    }
    return json({
      ok: true,
      data: mapProject(project)
    });
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return json(
      { ok: false, error: "Fehler beim Abrufen des Projekts" },
      { status: 500 }
    );
  }
};
const PATCH = async ({ request, params, locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return json({ ok: false, error: "Ungültige Projekt-ID" }, { status: 400 });
    }
    const body = await request.json();
    const validation = updateProjectSchema.safeParse(body);
    if (!validation.success) {
      return json(
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    const sql = getDb(locals.session.username, locals.session.password);
    const [existing] = await sql`SELECT id FROM projects WHERE id = ${projectId}`;
    if (!existing) {
      return json({ ok: false, error: "Projekt nicht gefunden" }, { status: 404 });
    }
    const updates = [];
    const values = [];
    if (validation.data.name !== void 0) {
      updates.push(`name = $${values.length + 1}`);
      values.push(validation.data.name);
    }
    if (validation.data.description !== void 0) {
      updates.push(`description = $${values.length + 1}`);
      values.push(validation.data.description);
    }
    values.push(projectId);
    const [project] = await sql`
			UPDATE projects
			SET ${sql(updates.join(", "))}
			WHERE id = ${projectId}
			RETURNING *
		`;
    return json({
      ok: true,
      data: mapProject(project)
    });
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error);
    return json(
      { ok: false, error: "Fehler beim Aktualisieren des Projekts" },
      { status: 500 }
    );
  }
};
const DELETE = async ({ params, locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return json({ ok: false, error: "Ungültige Projekt-ID" }, { status: 400 });
    }
    const sql = getDb(locals.session.username, locals.session.password);
    const [existing] = await sql`SELECT id FROM projects WHERE id = ${projectId}`;
    if (!existing) {
      return json({ ok: false, error: "Projekt nicht gefunden" }, { status: 404 });
    }
    await sql`DELETE FROM projects WHERE id = ${projectId}`;
    return json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return json(
      { ok: false, error: "Fehler beim Löschen des Projekts" },
      { status: 500 }
    );
  }
};
export {
  DELETE,
  GET,
  PATCH
};
