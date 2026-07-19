import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/db';

// Ticket #529: Generischer Attachment-Upload (V13__Attachments.sql). Aktuell
// einziger Konsument sind Canvas-Bild-Elemente (content.attachment_id), die
// ticket_attachments-Verknüpfung aus #469 ist NICHT Teil dieses Tickets.
//
// Whitelist + Größenlimit spiegeln exakt die DB-CHECKs aus V13 — Ablehnung
// hier VOR dem Insert liefert eine sprechende 400-Antwort statt einer rohen
// CHECK-constraint-Fehlermeldung.
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB, siehe V13 size_bytes-CHECK

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// Defense-in-depth: der vom Browser gemeldete .type ist reine Client-Angabe
// (eine umbenannte .txt-Datei kann sich als image/png ausgeben) — die
// tatsächlichen Magic Bytes am Dateianfang entscheiden, nicht das
// deklarierte MIME. SVG ist bewusst nicht in der Whitelist (ADR-004,
// Script-Injection-Risiko); ein reiner Byte-Vergleich reicht hier, keine
// neue Dependency nötig.
function matchesMagicBytes(type: AllowedMimeType, bytes: Uint8Array): boolean {
	const startsWith = (sig: number[]) => sig.every((b, i) => bytes[i] === b);

	switch (type) {
		case 'image/png':
			return startsWith([0x89, 0x50, 0x4e, 0x47]);
		case 'image/jpeg':
			return startsWith([0xff, 0xd8, 0xff]);
		case 'image/gif':
			// "GIF87a" oder "GIF89a"
			return startsWith([0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61;
		case 'image/webp':
			// RIFF....WEBP: Bytes 0-3 "RIFF", Bytes 8-11 "WEBP"
			return (
				startsWith([0x52, 0x49, 0x46, 0x46]) &&
				bytes[8] === 0x57 &&
				bytes[9] === 0x45 &&
				bytes[10] === 0x42 &&
				bytes[11] === 0x50
			);
		default:
			return false;
	}
}

// POST /api/attachments - Datei hochladen (multipart/form-data, Feld "file")
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.session) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get('file');
		if (!(file instanceof File)) {
			return json({ ok: false, error: 'Keine Datei übermittelt' }, { status: 400 });
		}

		if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
			return json(
				{ ok: false, error: `Dateityp "${file.type || 'unbekannt'}" wird nicht unterstützt (erlaubt: PNG, JPEG, WEBP, GIF)` },
				{ status: 400 }
			);
		}

		if (file.size <= 0 || file.size > MAX_SIZE_BYTES) {
			return json({ ok: false, error: 'Datei ist leer oder überschreitet das Limit von 10 MiB' }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const declaredType = file.type as AllowedMimeType;

		if (!matchesMagicBytes(declaredType, buffer)) {
			return json(
				{ ok: false, error: 'Dateiinhalt entspricht nicht dem angegebenen Typ' },
				{ status: 400 }
			);
		}

		const sql = getDb(locals.session.username, locals.session.password);

		const [row] = await sql`
			INSERT INTO attachments (filename, mime_type, size_bytes, data, description, uploaded_by)
			VALUES (${file.name}, ${declaredType}, ${buffer.length}, ${buffer}, ${null}, ${locals.session.username})
			RETURNING id, filename, mime_type, size_bytes
		`;

		return json(
			{
				ok: true,
				data: {
					id: row.id,
					filename: row.filename,
					mime_type: row.mime_type,
					size_bytes: row.size_bytes
				}
			},
			{ status: 201 }
		);
	} catch (error: any) {
		console.error('POST /api/attachments error:', error);

		if (error.message?.includes('violates check constraint')) {
			return json({ ok: false, error: 'Datei verletzt die Größen- oder Typ-Beschränkung' }, { status: 400 });
		}

		return json({ ok: false, error: 'Fehler beim Hochladen der Datei' }, { status: 500 });
	}
};
