import { fail, redirect } from '@sveltejs/kit';
import { listFriends } from '#lib/features/friends/friends.server.js';
import { parsePostcard, sendPostcard } from '#lib/features/friends/postcards.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Only friends in a home can get one: there's no feed otherwise.
	const friends = (await listFriends(locals)).filter((friend) => friend.homeName);
	const to = url.searchParams.get('to');
	return { friends, to: friends.some((friend) => friend.id === to) ? to : null };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { to, body, photo, errors, message, valid } = parsePostcard(await request.formData());
		if (!valid) return fail(400, { to, body, errors, message });
		const sent = await sendPostcard(locals, to, { body, photo });
		if (sent.message) return fail(400, { to, body, errors, message: sent.message });
		redirect(303, `/profile/${to}?sent`);
	}
};
