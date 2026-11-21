import { fail, redirect } from '@sveltejs/kit';
import {
	forgetFriendLink,
	rememberFriendLink
} from '#lib/features/friends/friend-cookie.server.js';
import { acceptFriendLink, previewFriendLink } from '#lib/features/friends/friends.server.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * A friend link. Open to every stage (stage.ts): it shows who sent it, then the next step for
 * where you are. Accepting needs an account with a finished profile; a home isn't needed. Opened
 * too early (signed out, no profile yet), the link is remembered and you're brought back here
 * once you can accept it (friend-cookie.server.ts).
 */
export const load: PageServerLoad = async ({ params, locals, cookies }) => {
	const link = await previewFriendLink(locals, params.token);
	const waiting = link?.usable && !link.isYou && !link.alreadyFriends;
	// Not able to accept yet: keep the link until you've signed in and made a profile.
	if (waiting && (locals.stage === 'signed-out' || locals.stage === 'profile'))
		rememberFriendLink(cookies, params.token);
	else forgetFriendLink(cookies);
	return { link, stage: locals.stage };
};

export const actions: Actions = {
	accept: async ({ params, locals, cookies }) => {
		if (locals.stage !== 'ready' && locals.stage !== 'home')
			redirect(303, `/friend/${params.token}`);
		const { friendId, message } = await acceptFriendLink(locals, params.token);
		forgetFriendLink(cookies);
		if (message || !friendId) return fail(400, { message });
		redirect(303, locals.stage === 'ready' ? `/profile/${friendId}` : '/setup');
	}
};
