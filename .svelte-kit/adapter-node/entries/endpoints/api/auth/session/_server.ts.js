import { json } from "@sveltejs/kit";
import { getSessionInfo } from "../../../../../chunks/db.js";
const GET = async ({ cookies }) => {
  const sessionId = cookies.get("kbai_session");
  if (!sessionId) {
    return json(
      { ok: false, error: "Keine Session gefunden" },
      { status: 401 }
    );
  }
  const sessionInfo = getSessionInfo(sessionId);
  if (!sessionInfo) {
    return json(
      { ok: false, error: "Session abgelaufen oder ungültig" },
      { status: 401 }
    );
  }
  const publicSessionInfo = {
    username: sessionInfo.username,
    db_host: sessionInfo.db_host,
    db_port: sessionInfo.db_port,
    db_name: sessionInfo.db_name,
    hasSession: true
  };
  return json({ ok: true, data: publicSessionInfo });
};
export {
  GET
};
