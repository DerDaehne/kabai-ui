import { json, type RequestHandler } from '@sveltejs/kit';
import { getSessionInfo } from '$lib/db';
import type { SessionInfo } from '$lib/types';

export const GET: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get('kbai_session');
	
	if (!sessionId) {
		return json(
			{ ok: false, error: 'Keine Session gefunden' },
			{ status: 401 }
		);
	}
	
	const sessionInfo = getSessionInfo(sessionId);
	
	if (!sessionInfo) {
		return json(
			{ ok: false, error: 'Session abgelaufen oder ungültig' },
			{ status: 401 }
		);
	}
	
	// Nur die basischen Session-Infos zurückgeben (keine Credentials!)
	const publicSessionInfo: Omit<SessionInfo, 'password'> & { hasSession: boolean } = {
		username: sessionInfo.username,
		db_host: sessionInfo.db_host,
		db_port: sessionInfo.db_port,
		db_name: sessionInfo.db_name,
		hasSession: true
	};
	
	return json({ ok: true, data: publicSessionInfo });
};
