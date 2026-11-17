import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Someone's profile photo, read with the signed-in person's own session, so row-level security
 * decides who can see it: yourself and the people in your home. The ?v= in the URL changes with
 * every new photo, so the browser can keep each one for a day.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { supabase } = locals;
	if (!supabase) error(404, 'No photo');

	const { data: profile } = await supabase
		.from('profiles')
		.select('avatar_path')
		.eq('id', params.id)
		.maybeSingle();
	if (!profile?.avatar_path) error(404, 'No photo');

	const { data: file, error: downloadError } = await supabase.storage
		.from('avatars')
		.download(profile.avatar_path);
	if (downloadError || !file) error(404, 'No photo');

	return new Response(file, {
		headers: {
			'content-type': file.type || 'image/jpeg',
			'cache-control': 'private, max-age=86400'
		}
	});
};
