import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		dbHost: env.KABAI_DB_HOST || 'localhost',
		dbPort: env.KABAI_DB_PORT || '5432',
		dbName: env.KABAI_DB_NAME || 'kabai'
	};
};
