import { error, fail, redirect } from '@sveltejs/kit';
import { getPublicProfile } from '#lib/features/friends/public-profile.server.js';
import {
	answerRequest,
	cancelRequest,
	sendRequest
} from '#lib/features/friends/requests.server.js';
import type { Actions, PageServerLoad } from './$types';

/** Someone's public profile. Yourself and your friends have fuller pages, so they go there. */
export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await getPublicProfile(locals, params.id);
	if (!person) error(404, 'That profile isn’t available.');
	if (person.isYou) redirect(303, '/profile');
	if (person.isFriend) redirect(303, `/profile/${person.id}`);
	return { person };
};

export const actions: Actions = {
	/** Asks them to be friends. If they'd already asked you, you're friends now. */
	request: async ({ locals, params }) => {
		const { result, message } = await sendRequest(locals, params.id);
		if (message) return fail(400, { message });
		if (result === 'friends') redirect(303, `/profile/${params.id}`);
	},

	answer: async ({ request, locals, params }) => {
		const accept = (await request.formData()).get('accept') === 'yes';
		const { message } = await answerRequest(locals, params.id, accept);
		if (message) return fail(400, { message });
		if (accept) redirect(303, `/profile/${params.id}`);
	},

	cancel: async ({ locals, params }) => {
		const { message } = await cancelRequest(locals, params.id);
		if (message) return fail(400, { message });
	}
};
