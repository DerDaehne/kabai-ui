import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const RAIL_OPEN_KEY = 'kabai:railOpen';

// Rail-Zustand session-lokal merken (z.B. bei Reload innerhalb der Session erhalten).
function readInitialRailOpen(): boolean {
	if (!browser) return false;
	return sessionStorage.getItem(RAIL_OPEN_KEY) === '1';
}

// Steuert die Sichtbarkeit der rechten AI-Aktivität-Rail im App-Layout.
export const railOpen = writable(readInitialRailOpen());

if (browser) {
	railOpen.subscribe(open => {
		sessionStorage.setItem(RAIL_OPEN_KEY, open ? '1' : '0');
	});
}

// Ticket-ID, das die AI-Activity-Rail öffnen möchte (Rail liegt im Layout, das
// Sidepanel-State liegt auf der Projektseite). Die Projektseite subscribed,
// öffnet das Ticket und setzt den Store zurück auf null.
export const openTicketRequest = writable<number | null>(null);

// Manuell kollabierte SideNav (56px-Icon-Rail) für schmale Monitore; unterhalb
// von 768px kollabiert sie unabhängig davon weiterhin automatisch per CSS.
const NAV_COLLAPSED_KEY = 'kabai:navCollapsed';

function readInitialNavCollapsed(): boolean {
	if (!browser) return false;
	return sessionStorage.getItem(NAV_COLLAPSED_KEY) === '1';
}

export const navCollapsed = writable(readInitialNavCollapsed());

if (browser) {
	navCollapsed.subscribe(collapsed => {
		sessionStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? '1' : '0');
	});
}
