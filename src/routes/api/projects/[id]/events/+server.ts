import { error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) throw error(401, 'Unauthorized');

	const projectId = parseInt(params.id);
	if (isNaN(projectId)) throw error(400, 'Invalid project ID');

	const { username, password } = locals.session;
	const sql = getDb(username, password);
	const channel = `tickets_${projectId}`;
	const encoder = new TextEncoder();
	let pingInterval: ReturnType<typeof setInterval>;

	let subscription: { unlisten: () => Promise<void> } | null = null;

	const stream = new ReadableStream<Uint8Array>({
		async start(ctrl) {
			const enqueue = (chunk: string) => {
				try { ctrl.enqueue(encoder.encode(chunk)); } catch { /* stream closed */ }
			};

			try {
				subscription = await sql.listen(channel, (payload) => enqueue(`data: ${payload}\n\n`));
			} catch {
				ctrl.close();
				return;
			}

			pingInterval = setInterval(() => enqueue(': ping\n\n'), 25_000);
		},

		async cancel() {
			clearInterval(pingInterval);
			// sql ist der geteilte Connection-Pool des Nutzers (siehe db.ts) —
			// nur die eigene LISTEN-Subscription abmelden, den Pool selbst NICHT
			// schließen, sonst reißt das alle anderen offenen Tabs/Requests
			// desselben Nutzers mit.
			await subscription?.unlisten().catch(() => {});
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};
