import { error, fail, redirect } from '@sveltejs/kit';
import { blockPerson, getFriend, removeFriend } from '#lib/features/friends/friends.server.js';
import { listPostcardsBetween } from '#lib/features/friends/postcards.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const [friend, postcards] = await Promise.all([
		getFriend(locals, params.id),
		listPostcardsBetween(locals, params.id)
	]);
	if (!friend) error(404, 'They’re not on your friends list.');
	return { friend, postcards, sent: url.searchParams.has('sent') };
};

export const actions: Actions = {
	remove: async ({ locals, params }) => {
		const { message } = await removeFriend(locals, params.id);
		if (message) return fail(400, { message });
		redirect(303, '/profile');
	},

	block: async ({ locals, params }) => {
		const friend = await getFriend(locals, params.id);
		const { message } = await blockPerson(locals, params.id, friend?.name ?? 'Someone');
		if (message) return fail(400, { message });
		redirect(303, '/profile');
	}
};
