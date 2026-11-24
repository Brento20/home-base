import { fail } from '@sveltejs/kit';
import {
	listBlocked,
	listFriendLinks,
	revokeFriendLink,
	unblockPerson
} from '#lib/features/friends/friends.server.js';
import { cancelRequest, listRequests } from '#lib/features/friends/requests.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [requests, links, blocked] = await Promise.all([
		listRequests(locals),
		listFriendLinks(locals),
		listBlocked(locals)
	]);
	return { sent: requests.filter((request) => !request.incoming), links, blocked };
};

const field = async (request: Request, name: string) =>
	String((await request.formData()).get(name) ?? '');

export const actions: Actions = {
	cancel: async ({ request, locals }) => {
		const { message } = await cancelRequest(locals, await field(request, 'person'));
		if (message) return fail(400, { message });
	},

	revoke: async ({ request, locals }) => {
		const { message } = await revokeFriendLink(locals, await field(request, 'id'));
		if (message) return fail(400, { message });
	},

	unblock: async ({ request, locals }) => {
		const { message } = await unblockPerson(locals, await field(request, 'id'));
		if (message) return fail(400, { message });
	}
};
