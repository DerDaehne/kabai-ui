const manifest = (() => {
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
			__memo(() => import('./chunks/0-CvvzUBEo.js')),
			__memo(() => import('./chunks/1-BHlMzlIf.js')),
			__memo(() => import('./chunks/2-By1BxzKU.js')),
			__memo(() => import('./chunks/3-fqK3vPm0.js')),
			__memo(() => import('./chunks/4-wLsRTTev.js')),
			__memo(() => import('./chunks/5-CDyD-si0.js')),
			__memo(() => import('./chunks/6-DITTJIJm.js')),
			__memo(() => import('./chunks/7-DWaz4OQ5.js')),
			__memo(() => import('./chunks/8-BFg7gi5V.js')),
			__memo(() => import('./chunks/9-C5fggZnC.js')),
			__memo(() => import('./chunks/10-ByNLOdEO.js')),
			__memo(() => import('./chunks/11-CIPwsOUg.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/api/auth/login",
				pattern: /^\/api\/auth\/login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BWz6GXVL.js'))
			},
			{
				id: "/api/auth/logout",
				pattern: /^\/api\/auth\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BiuathLV.js'))
			},
			{
				id: "/api/auth/session",
				pattern: /^\/api\/auth\/session\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CQtcz7rz.js'))
			},
			{
				id: "/api/projects",
				pattern: /^\/api\/projects\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CQJS5fxM.js'))
			},
			{
				id: "/api/projects/[id]",
				pattern: /^\/api\/projects\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CleIZu9C.js'))
			},
			{
				id: "/api/projects/[id]/statuses",
				pattern: /^\/api\/projects\/([^/]+?)\/statuses\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-r6-6-tOc.js'))
			},
			{
				id: "/api/projects/[id]/statuses/[sid]",
				pattern: /^\/api\/projects\/([^/]+?)\/statuses\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"sid","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B7376d_w.js'))
			},
			{
				id: "/api/projects/[id]/tickets",
				pattern: /^\/api\/projects\/([^/]+?)\/tickets\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BGR4XOgd.js'))
			},
			{
				id: "/api/projects/[id]/transitions",
				pattern: /^\/api\/projects\/([^/]+?)\/transitions\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B96dr0ss.js'))
			},
			{
				id: "/api/projects/[id]/transitions/[from]/[to]",
				pattern: /^\/api\/projects\/([^/]+?)\/transitions\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"from","optional":false,"rest":false,"chained":false},{"name":"to","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-NSfNNzHL.js'))
			},
			{
				id: "/api/tickets/[id]",
				pattern: /^\/api\/tickets\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DR4AGCxv.js'))
			},
			{
				id: "/api/tickets/[id]/comments",
				pattern: /^\/api\/tickets\/([^/]+?)\/comments\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BU99Pkrt.js'))
			},
			{
				id: "/api/tickets/[id]/tasks",
				pattern: /^\/api\/tickets\/([^/]+?)\/tasks\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cz9StNgn.js'))
			},
			{
				id: "/api/tickets/[id]/tasks/[tid]",
				pattern: /^\/api\/tickets\/([^/]+?)\/tasks\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"tid","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D-HpvPen.js'))
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

const prerendered = new Set([]);

export { manifest, prerendered };
//# sourceMappingURL=manifest.js.map
