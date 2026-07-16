// Ticket #510: Zentrale Spalten-/Status-Akzentfarben (Theme v3: Farbe trägt
// Bedeutung, keine Regenbogen-Codierung mehr für Chips/Hover/Drag-Feedback —
// die laufen einheitlich über Primary). Nur noch für den kleinen
// Orientierungspunkt je Spalte/Status verwendet.
// Konsolidiert aus KanbanColumn.svelte, StatusesModal.svelte und
// projects/[id]/statuses/+page.svelte, die bisher identische Kopien pflegten.
export const accentColors = [
	{ border: '#6e7bf2', glow: 'rgba(110,123,242,0.15)' },
	{ border: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
	{ border: '#3da06b', glow: 'rgba(61,160,107,0.15)' },
	{ border: '#c98a2d', glow: 'rgba(201,138,45,0.15)' },
	{ border: '#c25252', glow: 'rgba(194,82,82,0.15)' },
];

export function accentFor(i: number) {
	return accentColors[i % accentColors.length];
}
