import { json } from "@sveltejs/kit";
import { deleteSession } from "../../../../../chunks/db.js";
const POST = async ({ cookies }) => {
  try {
    const sessionId = cookies.get("kbai_session");
    if (sessionId) {
      deleteSession(sessionId);
      cookies.delete("kbai_session", { path: "/" });
    }
    return json({ ok: true });
  } catch (error) {
    console.error("Logout error:", error);
    return json(
      { ok: false, error: "Fehler beim Logout" },
      { status: 500 }
    );
  }
};
const GET = async ({ cookies }) => {
  const sessionId = cookies.get("kbai_session");
  if (sessionId) {
    deleteSession(sessionId);
    cookies.delete("kbai_session", { path: "/" });
  }
  return new Response(null, {
    status: 302,
    headers: {
      location: "/login?success=Erfolgreich+abgemeldet"
    }
  });
};
export {
  GET,
  POST
};
