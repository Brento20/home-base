import { error } from '@sveltejs/kit';
import { getPostPhoto } from '#lib/features/feed/feed.server.js';
import type { RequestHandler } from './$types';

/**
 * A feed post's photo, read with the signed-in person's own session, so row-level security
 * decides who can see it: only the people in that home. A post's photo never changes, so the
 * browser (and the service worker) can keep it.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const file = await getPostPhoto(locals, params.postId);
	if (!file) error(404, 'No photo');

	return new Response(file, {
		headers: {
			'content-type': file.type || 'image/jpeg',
			'cache-control': 'private, max-age=31536000, immutable'
		}
	});
};
