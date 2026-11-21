import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Someone's profile photo, read with the signed-in person's own session, so row-level security
 * decides who can see it: yourself, the people in your home and your friends. The ?v= in the
 * URL changes with every new photo, so the browser can keep each one for a day.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { supabase } = locals;
	if (!supabase) error(404, 'No photo');

	// Friends can't read each other's profile rows, so the path comes from a function that
	// answers for yourself, your home and your friends.
	const { data: path } = await supabase.rpc('visible_avatar_path', { person: params.id });
	if (typeof path !== 'string' || !path) error(404, 'No photo');

	const { data: file, error: downloadError } = await supabase.storage
		.from('avatars')
		.download(path);
	if (downloadError || !file) error(404, 'No photo');

	return new Response(file, {
		headers: {
			'content-type': file.type || 'image/jpeg',
			'cache-control': 'private, max-age=86400'
		}
	});
};
