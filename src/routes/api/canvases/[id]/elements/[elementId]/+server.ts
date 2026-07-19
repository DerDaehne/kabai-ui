import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { z } from 'zod';
import type { CanvasElement } from '$lib/types';

// parent_frame_id ist .nullable().optional(): Key fehlt im Body -> Feld bleibt
// unangetastet (unverändert), Key ist explizit null -> Frame-Zugehörigkeit
// lösen. Die Unterscheidung "fehlt" vs. "ist null" passiert unten über
// `'parent_frame_id' in body`, da safeParse().data diese Information selbst
// nicht mehr trägt (optional() liefert bei fehlendem Key ebenfalls undefined).
const updateElementSchema = z.object({
	position_x: z.number().optional(),
	position_y: z.number().optional(),
	width: z.number().nullable().optional(),
	height: z.number().nullable().optional(),
	z_order: z.number().int().optional(),
	content: z
		.object({
			text: z.string().optional(),
			title: z.string().optional(),
			target_type: z.enum(['ticket', 'note']).optional(),
			target_id: z.number().int().optional(),
			attachment_id: z.number().int().optional(),
			strokes: z.array(z.array(z.tuple([z.number(), z.number(), z.number()]))).optional()
		})
		.optional(),
	description: z.string().nullable().optional(),
	parent_frame_id: z.number().int().nullable().optional()
});

function mapElement(row: any): CanvasElement {
	return {
		id: row.id,
		canvas_id: row.canvas_id,
		type: row.type,
		position_x: Number(row.position_x),
		position_y: Number(row.position_y),
		width: row.width === null ? null : Number(row.width),
		height: row.height === null ? null : Number(row.height),
		z_order: row.z_order,
		content: row.content ?? {},
		description: row.description,
		parent_frame_id: row.parent_frame_id,
		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

// PATCH /api/canvases/[id]/elements/[elementId] - Teilupdate eines Elements
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const canvasId = parseInt(params.id);
		const elementId = parseInt(params.elementId);
		if (isNaN(canvasId) || isNaN(elementId)) {
			return json({ ok: false, error: 'Ungültige ID' }, { status: 400 });
		}

		const body = await request.json();
		const validation = updateElementSchema.safeParse(body);
		if (!validation.success) {
			return json({ ok: false, error: validation.error.errors[0].message }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [existing] = await sql`
			SELECT id FROM canvas_elements WHERE id = ${elementId} AND canvas_id = ${canvasId}
		`;
		if (!existing) {
			return json({ ok: false, error: 'Element nicht gefunden' }, { status: 404 });
		}

		const updates: Record<string, unknown> = {};
		const { data } = validation;
		if (data.position_x !== undefined) updates.position_x = data.position_x;
		if (data.position_y !== undefined) updates.position_y = data.position_y;
		if (data.width !== undefined) updates.width = data.width;
		if (data.height !== undefined) updates.height = data.height;
		if (data.z_order !== undefined) updates.z_order = data.z_order;
		if (data.content !== undefined) updates.content = sql.json(data.content);
		if (data.description !== undefined) updates.description = data.description;
		// Explizit-null-Fall: der Key muss im rohen Body vorkommen (nicht nur
		// im geparsten Ergebnis, das bei optional() für "fehlt" und "null"
		// gleichermaßen undefined/null liefern kann je nach Schema-Reihenfolge).
		if (Object.prototype.hasOwnProperty.call(body, 'parent_frame_id')) {
			updates.parent_frame_id = data.parent_frame_id ?? null;
		}

		if (Object.keys(updates).length > 0) {
			await sql`UPDATE canvas_elements SET ${sql(updates)} WHERE id = ${elementId}`;
		}

		const [row] = await sql`SELECT * FROM canvas_elements WHERE id = ${elementId}`;
		return json({ ok: true, data: mapElement(row) });
	} catch (error: any) {
		console.error('PATCH /api/canvases/[id]/elements/[elementId] error:', error);

		if (error.message?.includes('Canvas integrity')) {
			return json({ ok: false, error: error.message }, { status: 400 });
		}
		if (error.message?.includes('violates foreign key constraint')) {
			return json({ ok: false, error: 'Referenziertes Frame-Element existiert nicht' }, { status: 400 });
		}

		return json({ ok: false, error: 'Fehler beim Aktualisieren des Elements' }, { status: 500 });
	}
};

// DELETE /api/canvases/[id]/elements/[elementId] - Element löschen.
// Kinder (parent_frame_id) werden per ON DELETE SET NULL aus V12 automatisch
// befreit statt mitgelöscht; Kanten am Element cascadieren (ON DELETE CASCADE).
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const canvasId = parseInt(params.id);
		const elementId = parseInt(params.elementId);
		if (isNaN(canvasId) || isNaN(elementId)) {
			return json({ ok: false, error: 'Ungültige ID' }, { status: 400 });
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [existing] = await sql`
			SELECT id FROM canvas_elements WHERE id = ${elementId} AND canvas_id = ${canvasId}
		`;
		if (!existing) {
			return json({ ok: false, error: 'Element nicht gefunden' }, { status: 404 });
		}

		await sql`DELETE FROM canvas_elements WHERE id = ${elementId}`;

		return json({ ok: true });
	} catch (error) {
		console.error('DELETE /api/canvases/[id]/elements/[elementId] error:', error);
		return json({ ok: false, error: 'Fehler beim Löschen des Elements' }, { status: 500 });
	}
};
