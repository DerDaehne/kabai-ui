import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		dbHost: env.KBAI_DB_HOST || 'localhost',
		dbPort: env.KBAI_DB_PORT || '5432',
		dbName: env.KBAI_DB_NAME || 'kb_ai'
	};
};
