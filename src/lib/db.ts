import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import type { SessionInfo } from './types';

// Session Storage (In-Memory)
export const sessions = new Map<string, { username: string; password: string; expires: Date }>();

// Session TTL in Minuten (Default: 8 Stunden)
const SESSION_TTL_MINUTES = parseInt(env.KBAI_SESSION_TTL_MINUTES || '480');

// Session Secret für Signierung
const SESSION_SECRET = env.KBAI_SESSION_SECRET || 'default-secret-change-me';

/**
 * Erzeugt eine neue DB-Verbindung für einen Nutzer
 * Jede Session bekommt ihren eigenen Connection Pool
 */
export function getDb(username: string, password: string) {
	return postgres({
		host: env.KBAI_DB_HOST,
		port: parseInt(env.KBAI_DB_PORT || '5432'),
		database: env.KBAI_DB_NAME,
		username,
		password,
		max: 5,
		idle_timeout: 60,
		ssl: env.KBAI_DB_SSL === 'true' ? 'require' : undefined
	});
}

/**
 * Erzeugt eine Session-ID
 */
export function generateSessionId(): string {
	// Einfache Session-ID Generierung (für Demo-Zwecke)
	// In Produktion sollte man uuid oder crypto verwenden
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 15);
	return `${timestamp}-${random}`;
}

/**
 * Erstellt eine neue Session
 */
export function createSession(username: string, password: string): string {
	const sessionId = generateSessionId();
	const expires = new Date(Date.now() + SESSION_TTL_MINUTES * 60000);
	
	sessions.set(sessionId, { username, password, expires });
	
	return sessionId;
}

/**
 * Prüft und verlängert eine Session
 */
export function validateSession(sessionId: string): { username: string; password: string } | null {
	const session = sessions.get(sessionId);
	
	if (!session) {
		return null;
	}
	
	// Session abgelaufen
	if (session.expires <= new Date()) {
		sessions.delete(sessionId);
		return null;
	}
	
	// Session ist gültig - Expiration verlängern (Sliding Session)
	const newExpires = new Date(Date.now() + SESSION_TTL_MINUTES * 60000);
	session.expires = newExpires;
	sessions.set(sessionId, session);
	
	return { username: session.username, password: session.password };
}

/**
 * Löscht eine Session
 */
export function deleteSession(sessionId: string): boolean {
	return sessions.delete(sessionId);
}

/**
 * Löscht alle abgelaufenen Sessions
 */
export function cleanupExpiredSessions(): number {
	const now = new Date();
	let count = 0;
	
	for (const [sessionId, session] of sessions.entries()) {
		if (session.expires <= now) {
			sessions.delete(sessionId);
			count++;
		}
	}
	
	return count;
}

/**
 * Holt Session-Info für den aktuellen Nutzer
 */
export function getSessionInfo(sessionId: string): SessionInfo | null {
	const session = sessions.get(sessionId);
	
	if (!session) {
		return null;
	}
	
	return {
		username: session.username,
		db_host: env.KBAI_DB_HOST || 'localhost',
		db_port: env.KBAI_DB_PORT || '5432',
		db_name: env.KBAI_DB_NAME || 'kb_ai'
	};
}

/**
 * Testet die DB-Verbindung mit den Credentials
 */
export async function testConnection(username: string, password: string): Promise<boolean> {
	const sql = getDb(username, password);
	try {
		await sql`SELECT 1`;
		return true;
	} catch (error) {
		console.error('Connection test failed:', error);
		return false;
	} finally {
		await sql.end({ timeout: 5 });
	}
}

// Export für hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handleSession: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('kbai_session');
	
	if (sessionId && sessions.has(sessionId)) {
		const session = sessions.get(sessionId)!;
		if (session.expires > new Date()) {
			event.locals.session = {
				username: session.username,
				password: session.password
			};
		} else {
			sessions.delete(sessionId);
		}
	}
	
	return resolve(event);
};
