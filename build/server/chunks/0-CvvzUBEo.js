import './db-hpqnzzJE.js';
import 'postgres';

const load = async ({ locals, url }) => {
  const session = locals.session;
  url.searchParams.get("session_id");
  let sessionInfo = null;
  if (session) {
    const { sessions } = await import('./db-hpqnzzJE.js');
    const currentSession = sessions.get(url.cookies.get("kbai_session") || "");
    if (currentSession) {
      sessionInfo = {
        username: currentSession.username,
        db_host: process.env.KBAI_DB_HOST || "localhost",
        db_port: process.env.KBAI_DB_PORT || "5432",
        db_name: process.env.KBAI_DB_NAME || "kb_ai"
      };
    }
  }
  const toasts = [];
  if (url.searchParams.has("error")) {
    toasts.push({
      id: Date.now().toString(),
      type: "error",
      message: url.searchParams.get("error") || "Ein Fehler ist aufgetreten",
      title: "Fehler"
    });
  }
  if (url.searchParams.has("success")) {
    toasts.push({
      id: Date.now().toString(),
      type: "success",
      message: url.searchParams.get("success") || "Erfolgreich",
      title: "Erfolg"
    });
  }
  if (url.searchParams.get("reason") === "expired") {
    toasts.push({
      id: Date.now().toString(),
      type: "warning",
      message: "Ihre Session ist abgelaufen. Bitte melden Sie sich erneut an.",
      title: "Session abgelaufen"
    });
  }
  return {
    session: sessionInfo,
    toasts,
    title: getTitleFromPath(url.pathname)
  };
};
function getTitleFromPath(path) {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";
  const lastSegment = segments[segments.length - 1];
  const translations = {
    "projects": "Projekte",
    "new": "Neu erstellen",
    "settings": "Einstellungen",
    "statuses": "Statuses",
    "workflow": "Workflow",
    "tickets": "Tickets",
    "login": "Anmelden"
  };
  return translations[lastSegment] || lastSegment;
}

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-C3kjXiGf.js')).default;
const server_id = "src/routes/+layout.server.ts";
const imports = ["_app/immutable/nodes/0.01tDJYYd.js","_app/immutable/chunks/BomhsrGC.js","_app/immutable/chunks/m1yKd9Hb.js","_app/immutable/chunks/gYCBdZBz.js","_app/immutable/chunks/DIXEe1SP.js","_app/immutable/chunks/BZFPSWeI.js","_app/immutable/chunks/DgPznraf.js","_app/immutable/chunks/DK8VYm0h.js","_app/immutable/chunks/C2bHJZiv.js","_app/immutable/chunks/D9b6EI0G.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=0-CvvzUBEo.js.map
