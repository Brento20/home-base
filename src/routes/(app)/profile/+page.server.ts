import { fail } from '@sveltejs/kit';
import { getAccountDetails } from '#lib/features/account/account.server.js';
import { friendLink } from '#lib/features/friends/friends.js';
import {
	createFriendLink,
	listBlocked,
	listFriendLinks,
	listFriends
} from '#lib/features/friends/friends.server.js';
import { listRecentPostcards } from '#lib/features/friends/postcards.server.js';
import { getMyPublicProfile } from '#lib/features/friends/public-profile.server.js';
import {
	answerRequest,
	getFriendCode,
	listRequests,
	resetFriendCode,
	sendRequestByCode
} from '#lib/features/friends/requests.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [account, friends, links, blocked, postcards, publicProfile, requests, code] =
		await Promise.all([
			getAccountDetails(locals),
			listFriends(locals),
			listFriendLinks(locals),
			listBlocked(locals),
			listRecentPostcards(locals, 5),
			getMyPublicProfile(locals),
			listRequests(locals),
			getFriendCode(locals)
		]);
	// What's waiting in Manage friends, for its row (the lists themselves live there).
	const manage = {
		sent: requests.filter((request) => !request.incoming).length,
		links: links.length,
		blocked: blocked.length
	};
	return { account, friends, manage, postcards, publicProfile, requests, code };
};

const field = async (request: Request, name: string) =>
	String((await request.formData()).get(name) ?? '');

export const actions: Actions = {
	/** A request to whoever has the code typed in. */
	requestCode: async ({ request, locals }) => {
		const code = await field(request, 'code');
		const { result, name, message } = await sendRequestByCode(locals, code);
		if (!result) return fail(400, { byCode: { code, message, done: null } });
		const done =
			result === 'friends' ? `You and ${name} are friends now.` : `Request sent to ${name}.`;
		return { byCode: { code: '', message: null, done } };
	},

	/** Yes or no to a request waiting on you. */
	answer: async ({ request, locals }) => {
		const form = await request.formData();
		const { message } = await answerRequest(
			locals,
			String(form.get('person') ?? ''),
			form.get('accept') === 'yes'
		);
		if (message) return fail(400, { answer: { message } });
	},

	/** A new friend code; the old one stops working at once. */
	newCode: async ({ locals }) => {
		await resetFriendCode(locals);
		return { newCode: true };
	},

	/** A new friend link. Its token is shown once, here; the database keeps only a hash. */
	link: async ({ locals, url }) => {
		const { token, message } = await createFriendLink(locals);
		if (!token) return fail(400, { link: { url: null, message } });
		return { link: { url: friendLink(url.origin, token), message: null } };
	}
};
