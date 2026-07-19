import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';
import type { SessionInfo, ToastMessage } from '$lib/types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const session = locals.session;

	let sessionInfo: SessionInfo | null = null;
	if (session) {
		sessionInfo = {
			username: session.username,
			db_host: env.KABAI_DB_HOST || 'localhost',
			db_port: env.KABAI_DB_PORT || '5432',
			db_name: env.KABAI_DB_NAME || 'kabai'
		};
	}

	const toasts: ToastMessage[] = [];

	if (url.searchParams.has('error')) {
		toasts.push({
			id: Date.now().toString(),
			type: 'error',
			message: url.searchParams.get('error') || 'Ein Fehler ist aufgetreten',
			title: 'Fehler'
		});
	}

	if (url.searchParams.has('success')) {
		toasts.push({
			id: Date.now().toString(),
			type: 'success',
			message: url.searchParams.get('success') || 'Erfolgreich',
			title: 'Erfolg'
		});
	}

	if (url.searchParams.get('reason') === 'expired') {
		toasts.push({
			id: Date.now().toString(),
			type: 'warning',
			message: 'Ihre Session ist abgelaufen. Bitte melden Sie sich erneut an.',
			title: 'Session abgelaufen'
		});
	}

	return {
		session: sessionInfo,
		toasts,
		title: getTitleFromPath(url.pathname)
	};
};

function getTitleFromPath(path: string): string {
	const segments = path.split('/').filter(Boolean);
	if (segments.length === 0) return 'Dashboard';

	const lastSegment = segments[segments.length - 1];

	const translations: Record<string, string> = {
		'projects': 'Projekte',
		'new': 'Neu erstellen',
		'settings': 'Einstellungen',
		'statuses': 'Statuses',
		'workflow': 'Workflow',
		'tickets': 'Tickets',
		'login': 'Anmelden',
		'help': 'Hilfe'
	};

	return translations[lastSegment] || lastSegment;
}
