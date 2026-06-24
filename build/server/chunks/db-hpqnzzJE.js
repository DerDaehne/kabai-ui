import postgres from 'postgres';

const sessions = /* @__PURE__ */ new Map();
const SESSION_TTL_MINUTES = parseInt(process.env.KBAI_SESSION_TTL_MINUTES || "480");
process.env.KBAI_SESSION_SECRET || "default-secret-change-me";
function getDb(username, password) {
  return postgres({
    host: process.env.KBAI_DB_HOST,
    port: parseInt(process.env.KBAI_DB_PORT || "5432"),
    database: process.env.KBAI_DB_NAME,
    username,
    password,
    max: 5,
    // kleine Pool-Größe, da per-Session
    idle_timeout: 60,
    // SSL nur bei Bedarf aktivieren
    ssl: process.env.KBAI_DB_SSL === "true" ? "require" : void 0
  });
}
function generateSessionId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}
function createSession(username, password) {
  const sessionId = generateSessionId();
  const expires = new Date(Date.now() + SESSION_TTL_MINUTES * 6e4);
  sessions.set(sessionId, { username, password, expires });
  return sessionId;
}
function validateSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  if (session.expires <= /* @__PURE__ */ new Date()) {
    sessions.delete(sessionId);
    return null;
  }
  const newExpires = new Date(Date.now() + SESSION_TTL_MINUTES * 6e4);
  session.expires = newExpires;
  sessions.set(sessionId, session);
  return { username: session.username, password: session.password };
}
function deleteSession(sessionId) {
  return sessions.delete(sessionId);
}
function cleanupExpiredSessions() {
  const now = /* @__PURE__ */ new Date();
  let count = 0;
  for (const [sessionId, session] of sessions.entries()) {
    if (session.expires <= now) {
      sessions.delete(sessionId);
      count++;
    }
  }
  return count;
}
function getSessionInfo(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  return {
    username: session.username,
    db_host: process.env.KBAI_DB_HOST || "localhost",
    db_port: process.env.KBAI_DB_PORT || "5432",
    db_name: process.env.KBAI_DB_NAME || "kb_ai"
  };
}
async function testConnection(username, password) {
  try {
    const sql = getDb(username, password);
    const result = await sql`SELECT 1`;
    return result.count > 0;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
}
const handleSession = async ({ event, resolve }) => {
  const sessionId = event.cookies.get("kbai_session");
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    if (session.expires > /* @__PURE__ */ new Date()) {
      event.locals.session = {
        username: session.username,
        password: session.password
      };
    } else {
      sessions.delete(sessionId);
    }
  }
  return resolve(event);
};

export { cleanupExpiredSessions, createSession, deleteSession, generateSessionId, getDb, getSessionInfo, handleSession, testConnection, validateSession };
//# sourceMappingURL=db-hpqnzzJE.js.map
