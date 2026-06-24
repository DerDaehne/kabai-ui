import { json } from "@sveltejs/kit";
import { testConnection, createSession } from "../../../../../chunks/db.js";
import { z } from "zod";
const loginSchema = z.object({
  username: z.string().min(1, "Username ist erforderlich"),
  password: z.string().min(1, "Password ist erforderlich")
});
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return json(
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    const { username, password } = validation.data;
    const isValid = await testConnection(username, password);
    if (!isValid) {
      return json(
        { ok: false, error: "Ungültige Anmeldedaten oder Verbindung zur Datenbank fehlgeschlagen" },
        { status: 401 }
      );
    }
    const sessionId = createSession(username, password);
    return json(
      { ok: true },
      {
        status: 200,
        headers: {
          "set-cookie": `kbai_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 8}`
        }
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return json(
      { ok: false, error: "Ein unerwarteter Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
};
export {
  POST
};
