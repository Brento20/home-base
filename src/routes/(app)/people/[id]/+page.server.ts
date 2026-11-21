import { error, redirect } from '@sveltejs/kit';
import { getPublicProfile } from '#lib/features/friends/public-profile.server.js';
import type { PageServerLoad } from './$types';

/** Someone's public profile. Yourself and your friends have fuller pages, so they go there. */
export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await getPublicProfile(locals, params.id);
	if (!person) error(404, 'That profile isn’t available.');
	if (person.isYou) redirect(303, '/profile');
	if (person.isFriend) redirect(303, `/profile/${person.id}`);
	return { person };
};
