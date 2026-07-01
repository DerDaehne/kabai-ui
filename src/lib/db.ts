import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import type { SessionInfo } from './types';

// Session Storage (In-Memory)
export const sessions = new Map<string, { username: string; password: string; expires: Date }>();

// Session TTL in Minuten (Default: 8 Stunden)
const SESSION_TTL_MINUTES = parseInt(env.KBAI_SESSION_TTL_MINUTES || '480');

// Session Secret für Signierung
const SESSION_SECRET = env.KBAI_SESSION_SECRET || 'default-secret-change-me';

// Connection-Pool-Cache pro Nutzer (username:password). getDb() wird pro
// Request aufgerufen — ohne Cache würde jeder Request einen frischen Pool
// mit bis zu 5 Verbindungen öffnen, die erst nach idle_timeout (60s) wieder
// abgebaut werden. Bei normaler Nutzung (mehrere parallele Fetches pro
// Seitenaufruf, SSE-Tabs) führte das schnell zu Postgres' "too many clients
// already". Ein Pool pro Nutzer wird über alle Requests hinweg wiederverwendet.
const dbPoolCache = new Map<string, ReturnType<typeof postgres>>();

function poolKey(username: string, password: string): string {
	return `${username}:${password}`;
}

/**
 * Erzeugt (oder holt aus dem Cache) den Connection Pool eines Nutzers
 */
export function getDb(username: string, password: string) {
	const key = poolKey(username, password);
	let sql = dbPoolCache.get(key);
	if (!sql) {
		sql = postgres({
			host: env.KBAI_DB_HOST,
			port: parseInt(env.KBAI_DB_PORT || '5432'),
			database: env.KBAI_DB_NAME,
			username,
			password,
			max: 5,
			idle_timeout: 60,
			ssl: env.KBAI_DB_SSL === 'true' ? 'require' : undefined
		});
		dbPoolCache.set(key, sql);
	}
	return sql;
}

/**
 * Schließt den gecachten Connection Pool eines Nutzers (z.B. bei Logout)
 */
async function closeDbPool(username: string, password: string): Promise<void> {
	const key = poolKey(username, password);
	const sql = dbPoolCache.get(key);
	if (sql) {
		dbPoolCache.delete(key);
		await sql.end({ timeout: 5 }).catch(() => {});
	}
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
		deleteSession(sessionId);
		return null;
	}
	
	// Session ist gültig - Expiration verlängern (Sliding Session)
	const newExpires = new Date(Date.now() + SESSION_TTL_MINUTES * 60000);
	session.expires = newExpires;
	sessions.set(sessionId, session);
	
	return { username: session.username, password: session.password };
}

/**
 * Löscht eine Session und schließt ihren DB-Connection-Pool
 */
export function deleteSession(sessionId: string): boolean {
	const session = sessions.get(sessionId);
	if (session) closeDbPool(session.username, session.password);
	return sessions.delete(sessionId);
}

/**
 * Löscht alle abgelaufenen Sessions und schließt ihre DB-Connection-Pools.
 * Fängt Nutzer ab, die den Tab schließen statt sich explizit auszuloggen —
 * ohne das würde deren Pool bis zum Server-Neustart offen bleiben.
 */
export function cleanupExpiredSessions(): number {
	const now = new Date();
	let count = 0;

	for (const [sessionId, session] of sessions.entries()) {
		if (session.expires <= now) {
			closeDbPool(session.username, session.password);
			sessions.delete(sessionId);
			count++;
		}
	}

	return count;
}

// Periodischer Sweep für abgelaufene Sessions (alle 10 Minuten)
setInterval(cleanupExpiredSessions, 10 * 60 * 1000);

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
 * Testet die DB-Verbindung mit den Credentials.
 * Nutzt bewusst NICHT getDb()/den Pool-Cache: das würde bei einem erneuten
 * Login mit denselben Credentials (z.B. zweiter Tab, Re-Login nach Ablauf)
 * den bereits aktiven, gecachten Pool der laufenden Session vorzeitig
 * schließen. Eigene, kurzlebige Verbindung nur für den Test.
 */
export async function testConnection(username: string, password: string): Promise<boolean> {
	const sql = postgres({
		host: env.KBAI_DB_HOST,
		port: parseInt(env.KBAI_DB_PORT || '5432'),
		database: env.KBAI_DB_NAME,
		username,
		password,
		max: 1,
		ssl: env.KBAI_DB_SSL === 'true' ? 'require' : undefined
	});
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
			deleteSession(sessionId);
		}
	}
	
	return resolve(event);
};
