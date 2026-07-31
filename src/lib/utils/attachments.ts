// Ticket #692: Zwischenablage-Bild-Support für Ticket-Anhänge (Anlegen +
// Bearbeiten). Liefert null, wenn kein Bild im Clip liegt — Aufrufer lässt
// den Paste dann unangetastet (z.B. normales Text-Paste in ein Feld).
export function extractPastedImage(e: ClipboardEvent): File | null {
	const items = e.clipboardData?.items;
	if (!items) return null;
	for (const item of items) {
		if (item.type.startsWith('image/')) {
			return item.getAsFile();
		}
	}
	return null;
}
