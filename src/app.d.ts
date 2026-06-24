// Siehe https://kit.svelte.dev/docs/types#app
declare global {
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
