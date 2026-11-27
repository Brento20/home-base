import { redirect } from '@sveltejs/kit';
import { openNotification } from '#lib/features/notifications/notifications.server.js';
import { isLocalPath } from '#lib/local-path.js';
import type { RequestHandler } from './$types';

/**
 * Opening a notification, from the centre on Home or by tapping one on the lock screen: marks
 * it read and goes where it points. One that's gone (or someone else's) lands on the list.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const url = await openNotification(locals, params.id);
	redirect(303, isLocalPath(url) ? url : '/notifications');
};
