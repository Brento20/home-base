import { json } from '@sveltejs/kit';
import { markRead } from '#lib/features/notifications/notifications.server.js';
import type { RequestHandler } from './$types';

/** You've looked at your notifications (Home, or the full list): they're all seen now. */
export const POST: RequestHandler = async ({ locals }) => {
	await markRead(locals);
	return json({ ok: true });
};
