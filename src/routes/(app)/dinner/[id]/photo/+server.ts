import { error } from '@sveltejs/kit';
import { readRecipePhoto } from '#lib/features/recipes/recipe-photos.server.js';
import type { RequestHandler } from './$types';

/**
 * A recipe's photo, read with the viewer's own session, so row-level security keeps it to the
 * home. A new photo gets a new address (?v=), so the browser can keep each one for good.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const file = await readRecipePhoto(locals, params.id);
	if (!file) error(404, 'No photo');
	return new Response(file, {
		headers: {
			'content-type': file.type || 'image/jpeg',
			'cache-control': 'private, max-age=31536000, immutable'
		}
	});
};
