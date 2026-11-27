import { fail } from '@sveltejs/kit';
import { answerRequest } from '#lib/features/friends/requests.server.js';
import {
	forgetFriendRequest,
	listNotifications
} from '#lib/features/notifications/notifications.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	notifications: await listNotifications(locals, 60)
});

export const actions: Actions = {
	/** Yes or no to a friend request, right from its notification. */
	answer: async ({ request, locals }) => {
		const form = await request.formData();
		const person = String(form.get('person') ?? '');
		const { message } = await answerRequest(locals, person, form.get('accept') === 'yes');
		if (message) return fail(400, { answer: { message } });
		forgetFriendRequest(locals, person);
	}
};
