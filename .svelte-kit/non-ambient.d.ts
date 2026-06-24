
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/auth" | "/api/auth/login" | "/api/auth/logout" | "/api/auth/session" | "/api/projects" | "/api/projects/[id]" | "/api/projects/[id]/statuses" | "/api/projects/[id]/statuses/[sid]" | "/api/projects/[id]/tickets" | "/api/projects/[id]/transitions" | "/api/projects/[id]/transitions/[from]" | "/api/projects/[id]/transitions/[from]/[to]" | "/api/tickets" | "/api/tickets/[id]" | "/api/tickets/[id]/comments" | "/api/tickets/[id]/tasks" | "/api/tickets/[id]/tasks/[tid]" | "/login" | "/projects" | "/projects/new" | "/projects/[id]" | "/projects/[id]/settings" | "/projects/[id]/statuses" | "/projects/[id]/statuses/new" | "/projects/[id]/tickets" | "/projects/[id]/tickets/new" | "/projects/[id]/workflow" | "/tickets" | "/tickets/[id]";
		RouteParams(): {
			"/api/projects/[id]": { id: string };
			"/api/projects/[id]/statuses": { id: string };
			"/api/projects/[id]/statuses/[sid]": { id: string; sid: string };
			"/api/projects/[id]/tickets": { id: string };
			"/api/projects/[id]/transitions": { id: string };
			"/api/projects/[id]/transitions/[from]": { id: string; from: string };
			"/api/projects/[id]/transitions/[from]/[to]": { id: string; from: string; to: string };
			"/api/tickets/[id]": { id: string };
			"/api/tickets/[id]/comments": { id: string };
			"/api/tickets/[id]/tasks": { id: string };
			"/api/tickets/[id]/tasks/[tid]": { id: string; tid: string };
			"/projects/[id]": { id: string };
			"/projects/[id]/settings": { id: string };
			"/projects/[id]/statuses": { id: string };
			"/projects/[id]/statuses/new": { id: string };
			"/projects/[id]/tickets": { id: string };
			"/projects/[id]/tickets/new": { id: string };
			"/projects/[id]/workflow": { id: string };
			"/tickets/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string | undefined; sid?: string | undefined; from?: string | undefined; to?: string | undefined; tid?: string | undefined };
			"/api": { id?: string | undefined; sid?: string | undefined; from?: string | undefined; to?: string | undefined; tid?: string | undefined };
			"/api/auth": Record<string, never>;
			"/api/auth/login": Record<string, never>;
			"/api/auth/logout": Record<string, never>;
			"/api/auth/session": Record<string, never>;
			"/api/projects": { id?: string | undefined; sid?: string | undefined; from?: string | undefined; to?: string | undefined };
			"/api/projects/[id]": { id: string; sid?: string | undefined; from?: string | undefined; to?: string | undefined };
			"/api/projects/[id]/statuses": { id: string; sid?: string | undefined };
			"/api/projects/[id]/statuses/[sid]": { id: string; sid: string };
			"/api/projects/[id]/tickets": { id: string };
			"/api/projects/[id]/transitions": { id: string; from?: string | undefined; to?: string | undefined };
			"/api/projects/[id]/transitions/[from]": { id: string; from: string; to?: string | undefined };
			"/api/projects/[id]/transitions/[from]/[to]": { id: string; from: string; to: string };
			"/api/tickets": { id?: string | undefined; tid?: string | undefined };
			"/api/tickets/[id]": { id: string; tid?: string | undefined };
			"/api/tickets/[id]/comments": { id: string };
			"/api/tickets/[id]/tasks": { id: string; tid?: string | undefined };
			"/api/tickets/[id]/tasks/[tid]": { id: string; tid: string };
			"/login": Record<string, never>;
			"/projects": { id?: string | undefined };
			"/projects/new": Record<string, never>;
			"/projects/[id]": { id: string };
			"/projects/[id]/settings": { id: string };
			"/projects/[id]/statuses": { id: string };
			"/projects/[id]/statuses/new": { id: string };
			"/projects/[id]/tickets": { id: string };
			"/projects/[id]/tickets/new": { id: string };
			"/projects/[id]/workflow": { id: string };
			"/tickets": { id?: string | undefined };
			"/tickets/[id]": { id: string }
		};
		Pathname(): "/" | "/api/auth/login" | "/api/auth/logout" | "/api/auth/session" | "/api/projects" | `/api/projects/${string}` & {} | `/api/projects/${string}/statuses` & {} | `/api/projects/${string}/statuses/${string}` & {} | `/api/projects/${string}/tickets` & {} | `/api/projects/${string}/transitions` & {} | `/api/projects/${string}/transitions/${string}/${string}` & {} | `/api/tickets/${string}` & {} | `/api/tickets/${string}/comments` & {} | `/api/tickets/${string}/tasks` & {} | `/api/tickets/${string}/tasks/${string}` & {} | "/login" | "/projects" | "/projects/new" | `/projects/${string}` & {} | `/projects/${string}/settings` & {} | `/projects/${string}/statuses` & {} | `/projects/${string}/statuses/new` & {} | `/projects/${string}/tickets/new` & {} | `/projects/${string}/workflow` & {} | `/tickets/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}