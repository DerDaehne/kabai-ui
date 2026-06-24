import './db-hpqnzzJE.js';
import { r as redirect } from './index-DcnpJsrC.js';
import 'postgres';

const publicRoutes = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session"
];
const apiRoutes = [
  "/api/projects",
  "/api/projects/",
  "/api/tickets",
  "/api/tickets/"
];
function isApiRoute(path) {
  return apiRoutes.some((route) => path.startsWith(route));
}
function isPublicRoute(path) {
  return publicRoutes.some((route) => path === route || path.startsWith(route + "/"));
}
const handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  const sessionId = event.cookies.get("kbai_session");
  if (sessionId) {
    const { sessions } = await import('./db-hpqnzzJE.js');
    const session = sessions.get(sessionId);
    if (session && session.expires > /* @__PURE__ */ new Date()) {
      event.locals.session = {
        username: session.username,
        password: session.password
      };
    } else {
      sessions.delete(sessionId);
      event.cookies.delete("kbai_session", { path: "/" });
    }
  }
  if (!event.locals.session && !isPublicRoute(path) && !path.startsWith("/api/")) {
    if (sessionId) {
      throw redirect(302, "/login?reason=expired");
    }
    throw redirect(302, "/login");
  }
  if (isApiRoute(path) && !event.locals.session && !isPublicRoute(path)) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  return resolve(event);
};

export { handle };
//# sourceMappingURL=hooks.server-Cs-yo-9l.js.map
