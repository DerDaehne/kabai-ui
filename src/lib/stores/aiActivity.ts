import { writable, derived } from 'svelte/store';

// Session-lokaler Ereignis-Store für Live-Updates aus dem SSE-Kanal
// (tickets_<project_id>, siehe src/routes/api/projects/[id]/events/+server.ts).
// Keine Persistenz — beim Reload ist der Verlauf leer. Dient als Datenquelle für
// die künftige AI-Activity-Rail (#467) sowie für die Orbit-Highlight-Trigger auf
// Board-Karten/Ticket-Panel.

// op entspricht 1:1 TG_OP aus den Postgres-Triggern (V3/V5): INSERT, UPDATE, DELETE.
// Kein eigenes Mapping — der Server ist die Quelle der Wahrheit für diesen Wert.
export type AiEventOp = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AiEvent {
	id: number;
	ticket_id: number;
	op: AiEventOp;
	timestamp: Date;
}

const MAX_EVENTS = 50;

function createAiEventsStore() {
	const { subscribe, update } = writable<AiEvent[]>([]);
	let nextId = 1;

	function push(ticketId: number, op: string) {
		update(events => {
			const event: AiEvent = {
				id: nextId++,
				ticket_id: ticketId,
				op: op as AiEventOp,
				timestamp: new Date()
			};
			// neueste zuerst, Ring-Puffer auf MAX_EVENTS begrenzt
			return [event, ...events].slice(0, MAX_EVENTS);
		});
	}

	return { subscribe, push };
}

const aiEventsStore = createAiEventsStore();

// Öffentlicher readable Store (neueste zuerst)
export const aiEvents = { subscribe: aiEventsStore.subscribe };

export function pushAiEvent(ticketId: number, op: string) {
	aiEventsStore.push(ticketId, op);
}

// Letztes Event je Ticket — Grundlage für die Orbit-Highlight-Trigger auf
// Board-Karten und im Ticket-Panel (jede Änderung des Werts = neues Event für
// dieses Ticket, unabhängig vom konkreten op).
export const latestEventByTicket = derived(aiEvents, $events => {
	const map = new Map<number, AiEvent>();
	// $events ist neueste zuerst — beim ersten Treffer je Ticket nicht mehr überschreiben
	for (const event of $events) {
		if (!map.has(event.ticket_id)) map.set(event.ticket_id, event);
	}
	return map;
});

// Verbindungszustand der aktuell offenen SSE-Verbindung(en) — wird von der
// Projektseite gesetzt (onopen -> true, onerror -> false). Dient der künftigen
// AI-Activity-Rail (#467) als Live-Indikator.
export const sseConnected = writable(false);
