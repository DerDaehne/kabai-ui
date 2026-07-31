import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { Project } from '$lib/types';

// Validierungsschemas
const createProjectSchema = z.object({
	slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
	name: z.string().min(1, 'Name ist erforderlich'),
	description: z.string().nullable().optional(),
	// Ticket #690 (Codeberg kb.ai#9): ein Klick legt ein sofort arbeitbares
	// Standard-Board an, statt Spalten/Übergänge von Hand einzurichten.
	create_default_workflow: z.boolean().optional().default(false)
});

// Ticket #690: Default-Board für Einsteiger/Schnelltests. human_intervention/
// human_answered entstehen bereits automatisch pro Projekt (Backend-Trigger
// V6) — hier nur die vier normalen Arbeitsspalten + Übergänge inkl. Reopen.
const DEFAULT_WORKFLOW_STATUSES = [
	{ name: 'backlog', display_name: 'Backlog', position: 0, agent_role_instruction: null },
	{
		name: 'todo', display_name: 'Todo', position: 1,
		agent_role_instruction:
			'Du bist ein Planungs-Agent/Refiner. Zerlege das Ticket in konkrete, ' +
			'abarbeitbare Tasks (Akzeptanzkriterien) und kläre offene Fragen per ' +
			'Kommentar, bevor du es nach "In Arbeit" schiebst.'
	},
	{
		name: 'in_progress', display_name: 'In Arbeit', position: 2,
		agent_role_instruction:
			'Du bist der bearbeitende Agent. Arbeite die Tasks ab, committe oft ' +
			'und sinnvoll, und dokumentiere den Arbeitsfortschritt in Kommentaren.'
	},
	{
		name: 'done', display_name: 'Fertig', position: 3,
		agent_role_instruction:
			'Bevor du ein Ticket hierher verschiebst: stelle sicher, dass alle ' +
			'Tasks abgeschlossen, die Änderung dokumentiert und getestet ist.'
	}
];

const updateProjectSchema = z.object({
	name: z.string().min(1, 'Name ist erforderlich').optional(),
	description: z.string().nullable().optional()
});

// Helper: Project aus DB-Row mappen
function mapProject(row: any): Project {
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		description: row.description,
		archived: row.archived,
		created_at: row.created_at
	};
}

// GET /api/projects - Alle Projekte abrufen
export const GET: RequestHandler = async ({ locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const sql = getDb(locals.session.username, locals.session.password);
		const projects = await sql`SELECT * FROM projects ORDER BY created_at DESC`;
		
		return json({
			ok: true,
			data: projects.map(mapProject)
		});
	} catch (error) {
		console.error('GET /api/projects error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Abrufen der Projekte' },
			{ status: 500 }
		);
	}
};

// POST /api/projects - Neues Projekt erstellen
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		
		const body = await request.json();
		const validation = createProjectSchema.safeParse(body);
		
		if (!validation.success) {
			return json(
				{ ok: false, error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}
		
		const { slug, name, description, create_default_workflow } = validation.data;
		const sql = getDb(locals.session.username, locals.session.password);

		const [project] = await sql`
			INSERT INTO projects (slug, name, description)
			VALUES (${slug}, ${name}, ${description})
			RETURNING *
		`;

		if (create_default_workflow) {
			const statusIds: number[] = [];
			for (const s of DEFAULT_WORKFLOW_STATUSES) {
				const [row] = await sql`
					INSERT INTO board_statuses (project_id, name, display_name, position, agent_role_instruction)
					VALUES (${project.id}, ${s.name}, ${s.display_name}, ${s.position}, ${s.agent_role_instruction})
					RETURNING id
				`;
				statusIds.push(row.id);
			}
			const [backlogId, todoId, inProgressId, doneId] = statusIds;
			const transitions: [number, number][] = [
				[backlogId, todoId],
				[todoId, inProgressId],
				[inProgressId, doneId],
				[doneId, todoId] // Reopen
			];
			for (const [from, to] of transitions) {
				await sql`
					INSERT INTO status_transitions (project_id, from_status_id, to_status_id)
					VALUES (${project.id}, ${from}, ${to})
				`;
			}
		}

		return json({
			ok: true,
			data: mapProject(project)
		}, { status: 201 });
	} catch (error: any) {
		console.error('POST /api/projects error:', error);
		
		// Unique Constraint Violation
		if (error.message?.includes('duplicate key value violates unique constraint')) {
			return json(
				{ ok: false, error: 'Ein Projekt mit diesem Slug existiert bereits' },
				{ status: 409 }
			);
		}
		
		return json(
			{ ok: false, error: 'Fehler beim Erstellen des Projekts' },
			{ status: 500 }
		);
	}
};
