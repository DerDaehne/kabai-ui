import { writable } from 'svelte/store';

// Ticket #537: Registry-Muster für den globalen ":"-Shortcut (Command Palette)
// und "/"-Shortcut (Seiten-Suchfeld fokussieren). Jede Seite meldet beim Mounten
// (bzw. reaktiv) an, was auf ihr aktuell verfügbar ist, und räumt beim
// Verlassen (onDestroy) wieder auf — mirror von openTicketRequest in ui.ts.
//
// "/" ruft focusSearch() auf, falls gesetzt (sonst No-op, z.B. auf dem Board,
// das kein Suchfeld hat). ":" öffnet die Command Palette mit den Einträgen aus
// paletteActions (leer = Palette zeigt "keine Aktionen").

export interface CommandPaletteAction {
	id: string;
	label: string;
	run: () => void;
}

// Nullable Funktion, die das Suchfeld der aktuell aktiven Seite fokussiert.
// null bedeutet: aktuelle Seite hat kein Suchfeld ("/" ist dann ein No-op).
export const focusSearchField = writable<(() => void) | null>(null);

// Aktionen der aktuell aktiven Seite, die die Command Palette anzeigt.
export const paletteActions = writable<CommandPaletteAction[]>([]);

// Steuert die Sichtbarkeit der Command Palette (vom Root-Layout gerendert).
export const commandPaletteOpen = writable(false);
