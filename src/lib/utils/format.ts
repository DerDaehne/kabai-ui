// Ticket #510: Zentrale Datums-/Namens-Formatierungshelfer.
// Konsolidiert die bisher mehrfach kopierten Varianten aus ActivityRail.svelte,
// ProjectCard.svelte, TicketModal.svelte und diversen +page.svelte-Dateien.

/**
 * Relative Zeitangabe auf Deutsch ("gerade eben", "vor N Min.", "vor N Std.",
 * "vor N Tagen"). Basis ist die ProjectCard.svelte-Variante (feinere Abstufung
 * als die vormalige ActivityRail-Variante, die nur min/h kannte).
 */
export function relativeTime(input: string | Date): string {
	const then = input instanceof Date ? input.getTime() : new Date(input).getTime();
	const diffMs = Date.now() - then;
	const mins = Math.round(diffMs / 60000);
	if (mins < 1) return 'gerade eben';
	if (mins < 60) return `vor ${mins} Min.`;
	const hours = Math.round(mins / 60);
	if (hours < 24) return `vor ${hours} Std.`;
	const days = Math.round(hours / 24);
	return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
}

/**
 * Alter in Tagen als lesbarer String ("<1 Tag", "3 Tage(n)") — z.B. für das
 * Alter des ältesten offenen Tickets eines Projekts.
 */
export function ageInDays(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const days = Math.floor(diffMs / 86400000);
	if (days < 1) return '<1 Tag';
	return `${days} Tag${days !== 1 ? 'en' : ''}`;
}

/**
 * Datum im Format "16. Jul. 2026" (deutsches Locale, Tag/Monat kurz/Jahr).
 * Das im Repo am häufigsten verwendete toLocaleDateString-Options-Objekt.
 * Mit compact=true die kürzere Variante ohne Options (z.B. "16.7.2026"),
 * wie sie bei Kommentar-Zeitstempeln verwendet wird.
 */
export function formatDate(iso: string, compact: boolean = false): string {
	if (compact) return new Date(iso).toLocaleDateString('de-DE');
	return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Avatar-Initialen aus einem vollen Namen (max. 2 Buchstaben, z.B. "David Daehne" -> "DD").
 */
export function initials(name: string): string {
	return name
		.split(' ')
		.map((p) => p.charAt(0).toUpperCase())
		.slice(0, 2)
		.join('');
}
