import { j as json } from './index-DcnpJsrC.js';
import { getDb } from './db-hpqnzzJE.js';
import { z } from 'zod';
import 'postgres';

const createProjectSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten"),
  name: z.string().min(1, "Name ist erforderlich"),
  description: z.string().nullable().optional()
});
z.object({
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
const GET = async ({ locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const sql = getDb(locals.session.username, locals.session.password);
    const projects = await sql`SELECT * FROM projects ORDER BY created_at DESC`;
    return json({
      ok: true,
      data: projects.map(mapProject)
    });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return json(
      { ok: false, error: "Fehler beim Abrufen der Projekte" },
      { status: 500 }
    );
  }
};
const POST = async ({ request, locals }) => {
  try {
    if (!locals.session) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const validation = createProjectSchema.safeParse(body);
    if (!validation.success) {
      return json(
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    const { slug, name, description } = validation.data;
    const sql = getDb(locals.session.username, locals.session.password);
    const [project] = await sql`
			INSERT INTO projects (slug, name, description)
			VALUES (${slug}, ${name}, ${description})
			RETURNING *
		`;
    return json({
      ok: true,
      data: mapProject(project)
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    if (error.message?.includes("duplicate key value violates unique constraint")) {
      return json(
        { ok: false, error: "Ein Projekt mit diesem Slug existiert bereits" },
        { status: 409 }
      );
    }
    return json(
      { ok: false, error: "Fehler beim Erstellen des Projekts" },
      { status: 500 }
    );
  }
};

export { GET, POST };
//# sourceMappingURL=_server.ts-CQJS5fxM.js.map
