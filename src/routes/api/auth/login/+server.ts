import { json, type RequestHandler } from '@sveltejs/kit';
import { createSession, testConnection } from '$lib/db';
import { z } from 'zod';

// Validierungsschema für Login
const loginSchema = z.object({
	username: z.string().min(1, 'Username ist erforderlich'),
	password: z.string().min(1, 'Password ist erforderlich')
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Request Body parsen
		const body = await request.json();
		
		// Validierung
		const validation = loginSchema.safeParse(body);
		if (!validation.success) {
			return json(
				{ ok: false, error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}
		
		const { username, password } = validation.data;
		
		// Verbindungstest
		const isValid = await testConnection(username, password);
		if (!isValid) {
			return json(
				{ ok: false, error: 'Ungültige Anmeldedaten oder Verbindung zur Datenbank fehlgeschlagen' },
				{ status: 401 }
			);
		}
		
		// Session erstellen
		const sessionId = createSession(username, password);
		
		// Session-Cookie setzen
		return json(
			{ ok: true },
			{
				status: 200,
				headers: {
					'set-cookie': `kabai_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 8}`
				}
			}
		);
	} catch (error) {
		console.error('Login error:', error);
		return json(
			{ ok: false, error: 'Ein unerwarteter Fehler ist aufgetreten' },
			{ status: 500 }
		);
	}
};
