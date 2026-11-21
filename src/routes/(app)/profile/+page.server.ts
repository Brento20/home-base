import { fail } from '@sveltejs/kit';
import { getAccountDetails } from '#lib/features/account/account.server.js';
import { friendLink } from '#lib/features/friends/friends.js';
import {
	createFriendLink,
	listBlocked,
	listFriendLinks,
	listFriends,
	revokeFriendLink,
	unblockPerson
} from '#lib/features/friends/friends.server.js';
import { listRecentPostcards } from '#lib/features/friends/postcards.server.js';
import { getMyPublicProfile } from '#lib/features/friends/public-profile.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [account, friends, links, blocked, postcards, publicProfile] = await Promise.all([
		getAccountDetails(locals),
		listFriends(locals),
		listFriendLinks(locals),
		listBlocked(locals),
		listRecentPostcards(locals, 5),
		getMyPublicProfile(locals)
	]);
	return { account, friends, links, blocked, postcards, publicProfile };
};

export const actions: Actions = {
	/** A new friend link. Its token is shown once, here; the database keeps only a hash. */
	link: async ({ locals, url }) => {
		const { token, message } = await createFriendLink(locals);
		if (!token) return fail(400, { link: { url: null, message } });
		return { link: { url: friendLink(url.origin, token), message: null } };
	},

	revoke: async ({ request, locals }) => {
		const { message } = await revokeFriendLink(
			locals,
			String((await request.formData()).get('id') ?? '')
		);
		if (message) return fail(400, { revoke: { message } });
	},

	unblock: async ({ request, locals }) => {
		const { message } = await unblockPerson(
			locals,
			String((await request.formData()).get('id') ?? '')
		);
		if (message) return fail(400, { unblock: { message } });
	}
};
