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

	const stream = new ReadableStream<Uint8Array>({
		async start(ctrl) {
			const enqueue = (chunk: string) => {
				try { ctrl.enqueue(encoder.encode(chunk)); } catch { /* stream closed */ }
			};

			try {
				await sql.listen(channel, (payload) => enqueue(`data: ${payload}\n\n`));
			} catch {
				ctrl.close();
				await sql.end({ timeout: 5 }).catch(() => {});
				return;
			}

			pingInterval = setInterval(() => enqueue(': ping\n\n'), 25_000);
		},

		async cancel() {
			clearInterval(pingInterval);
			await sql.unlisten(channel).catch(() => {});
			await sql.end({ timeout: 5 }).catch(() => {});
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
