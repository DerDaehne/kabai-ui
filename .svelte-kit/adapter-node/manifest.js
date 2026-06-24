export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.CQ7EXxzr.js",app:"_app/immutable/entry/app.Bl6j2AoB.js",imports:["_app/immutable/entry/start.CQ7EXxzr.js","_app/immutable/chunks/C2bHJZiv.js","_app/immutable/chunks/m1yKd9Hb.js","_app/immutable/entry/app.Bl6j2AoB.js","_app/immutable/chunks/m1yKd9Hb.js","_app/immutable/chunks/BomhsrGC.js","_app/immutable/chunks/DIXEe1SP.js","_app/immutable/chunks/DgPznraf.js","_app/immutable/chunks/DK8VYm0h.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/api/auth/login",
				pattern: /^\/api\/auth\/login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/login/_server.ts.js'))
			},
			{
				id: "/api/auth/logout",
				pattern: /^\/api\/auth\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/logout/_server.ts.js'))
			},
			{
				id: "/api/auth/session",
				pattern: /^\/api\/auth\/session\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/session/_server.ts.js'))
			},
			{
				id: "/api/projects",
				pattern: /^\/api\/projects\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]",
				pattern: /^\/api\/projects\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/statuses",
				pattern: /^\/api\/projects\/([^/]+?)\/statuses\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/statuses/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/statuses/[sid]",
				pattern: /^\/api\/projects\/([^/]+?)\/statuses\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"sid","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/statuses/_sid_/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/tickets",
				pattern: /^\/api\/projects\/([^/]+?)\/tickets\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/tickets/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/transitions",
				pattern: /^\/api\/projects\/([^/]+?)\/transitions\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/transitions/_server.ts.js'))
			},
			{
				id: "/api/projects/[id]/transitions/[from]/[to]",
				pattern: /^\/api\/projects\/([^/]+?)\/transitions\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"from","optional":false,"rest":false,"chained":false},{"name":"to","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/projects/_id_/transitions/_from_/_to_/_server.ts.js'))
			},
			{
				id: "/api/tickets/[id]",
				pattern: /^\/api\/tickets\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/tickets/_id_/_server.ts.js'))
			},
			{
				id: "/api/tickets/[id]/comments",
				pattern: /^\/api\/tickets\/([^/]+?)\/comments\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/tickets/_id_/comments/_server.ts.js'))
			},
			{
				id: "/api/tickets/[id]/tasks",
				pattern: /^\/api\/tickets\/([^/]+?)\/tasks\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/tickets/_id_/tasks/_server.ts.js'))
			},
			{
				id: "/api/tickets/[id]/tasks/[tid]",
				pattern: /^\/api\/tickets\/([^/]+?)\/tasks\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"tid","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/tickets/_id_/tasks/_tid_/_server.ts.js'))
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/projects",
				pattern: /^\/projects\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/projects/new",
				pattern: /^\/projects\/new\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/projects/[id]",
				pattern: /^\/projects\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/projects/[id]/settings",
				pattern: /^\/projects\/([^/]+?)\/settings\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/projects/[id]/statuses",
				pattern: /^\/projects\/([^/]+?)\/statuses\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/projects/[id]/statuses/new",
				pattern: /^\/projects\/([^/]+?)\/statuses\/new\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/projects/[id]/tickets/new",
				pattern: /^\/projects\/([^/]+?)\/tickets\/new\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/projects/[id]/workflow",
				pattern: /^\/projects\/([^/]+?)\/workflow\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/tickets/[id]",
				pattern: /^\/tickets\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export const prerendered = new Set([]);
