import { error } from '@sveltejs/kit';
import { getPostcardPhoto } from '#lib/features/friends/postcards.server.js';
import type { RequestHandler } from './$types';

/**
 * A postcard's photo, read with the viewer's own session, so row-level security decides who can
 * see it: the home it was sent to and the person who sent it. It never changes, so the browser
 * (and the service worker) can keep it.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const file = await getPostcardPhoto(locals, params.id);
	if (!file) error(404, 'No photo');
	return new Response(file, {
		headers: {
			'content-type': file.type || 'image/jpeg',
			'cache-control': 'private, max-age=31536000, immutable'
		}
	});
};
