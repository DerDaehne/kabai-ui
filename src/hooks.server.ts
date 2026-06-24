import { redirect, type Handle } from '@sveltejs/kit';

// Liste der öffentlichen Routen, die keine Auth benötigen
const publicRoutes = [
	'/login',
	'/api/auth/login',
	'/api/auth/logout',
	'/api/auth/session'
];

// Liste der API-Routen, die Auth benötigen
const apiRoutes = [
	'/api/projects',
	'/api/projects/',
	'/api/tickets',
	'/api/tickets/'
];

/**
 * Prüft, ob der aktuelle Pfad eine API-Route ist
 */
function isApiRoute(path: string): boolean {
	return apiRoutes.some(route => path.startsWith(route));
}

/**
 * Prüft, ob der aktuelle Pfad eine öffentliche Route ist
 */
function isPublicRoute(path: string): boolean {
	return publicRoutes.some(route => path === route || path.startsWith(route + '/'));
}

/**
 * Session Hook - verwaltet die Session-Lebensdauer
 */
export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	event.locals.session = null;

	// Session aus Cookie lesen und in locals speichern
	const sessionId = event.cookies.get('kbai_session');
	
	if (sessionId) {
		// Session validieren und in locals speichern
		// (db.ts verwaltet den Session-Store)
		const { sessions } = await import('$lib/db');
		const session = sessions.get(sessionId);
		
		if (session && session.expires > new Date()) {
			event.locals.session = {
				username: session.username,
				password: session.password
			};
		} else {
			// Session abgelaufen - löschen
			sessions.delete(sessionId);
			event.cookies.delete('kbai_session', { path: '/' });
		}
	}
	
	// Redirect zu Login wenn:
	// 1. Keine Session vorhanden
	// 2. Keine öffentliche Route
	// 3. Keine API-Route (API-Routen haben eigene Fehlerbehandlung)
	if (!event.locals.session && !isPublicRoute(path) && !path.startsWith('/api/')) {
		// Spezielle Behandlung für abgelaufene Sessions
		if (sessionId) {
			// Session war vorhanden aber abgelaufen
			throw redirect(302, '/login?reason=expired');
		}
		throw redirect(302, '/login');
	}
	
	// API-Routen ohne Session blockieren (außer öffentliche API-Routen)
	if (isApiRoute(path) && !event.locals.session && !isPublicRoute(path)) {
		return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	
	return resolve(event);
};
