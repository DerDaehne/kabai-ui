// Siehe https://kit.svelte.dev/docs/types#app
declare global {
	// Zur Build-Zeit eingebettete Version (vite.config.ts define, Ticket #544)
	const __APP_VERSION__: string;

	namespace App {
		// interface Error {}
		interface Locals {
			session: {
				username: string;
				password: string;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
