import { json, type RequestHandler } from '@sveltejs/kit';
import { deleteSession } from '$lib/db';

export const POST: RequestHandler = async ({ cookies }) => {
	try {
		const sessionId = cookies.get('kbai_session');
		
		if (sessionId) {
			// Session löschen
			deleteSession(sessionId);
			
			// Cookie entfernen
			cookies.delete('kbai_session', { path: '/' });
		}
		
		return json({ ok: true });
	} catch (error) {
		console.error('Logout error:', error);
		return json(
			{ ok: false, error: 'Fehler beim Logout' },
			{ status: 500 }
		);
	}
};

// Auch GET-Request unterstützen für direkte Navigation
export const GET: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get('kbai_session');
	
	if (sessionId) {
		deleteSession(sessionId);
		cookies.delete('kbai_session', { path: '/' });
	}
	
	// Redirect zu Login
	return new Response(null, {
		status: 302,
		headers: {
			location: '/login?success=Erfolgreich+abgemeldet'
		}
	});
};
