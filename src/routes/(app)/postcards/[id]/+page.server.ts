import { fail, redirect } from '@sveltejs/kit';
import { blockPerson } from '#lib/features/friends/friends.server.js';
import { getPostcard, removePostcard } from '#lib/features/friends/postcards.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => ({
	postcard: await getPostcard(locals, params.id)
});

export const actions: Actions = {
	remove: async ({ locals, params }) => {
		const { message } = await removePostcard(locals, params.id);
		if (message) return fail(400, { message });
		redirect(303, '/');
	},

	/** Blocks whoever sent it: their postcards come down and no more arrive from them. */
	block: async ({ locals, params }) => {
		const { postcard } = await getPostcard(locals, params.id);
		if (!postcard?.profileId) return fail(400, { message: 'Their account is gone already.' });
		const { message } = await blockPerson(locals, postcard.profileId, postcard.name);
		if (message) return fail(400, { message });
		redirect(303, '/');
	}
};
