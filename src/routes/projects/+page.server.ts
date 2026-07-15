import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Ticket #494: Dashboard + Projekte wurden zu einer unifizierten Ansicht
// unter "/" zusammengelegt — Server-Redirect statt Client-Flash, damit alte
// Links/Bookmarks auf /projects weiter funktionieren.
export const load: PageServerLoad = async () => {
	throw redirect(308, '/');
};
