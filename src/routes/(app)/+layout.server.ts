import { countWaitingRequests } from '#lib/features/friends/requests.server.js';
import { getHousehold } from '#lib/features/household/household.server.js';
import { countUnread, pushPublicKey } from '#lib/features/notifications/notifications.server.js';
import { aiConfigured } from '#lib/server/ai.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	// Marking notifications seen reloads just this (invalidate('app:unread')).
	depends('app:unread');
	const [{ household, me }, requestsWaiting, unread] = await Promise.all([
		getHousehold(locals),
		countWaitingRequests(locals),
		countUnread(locals)
	]);
	// `ai`: whether the AI helpers show. Without a key they hide and forms work by hand.
	// `home`: its time zone and currency, so the phone shows dates and money as the server does.
	// `requestsWaiting`: friend requests waiting on you, a dot on your face on Home.
	// `unread`: notifications you haven't seen, a dot on the Home tab and the app icon's count.
	// `pushKey`: the public key phones subscribe to notifications with, or null if not set up.
	// `display`: your display preferences (src/lib/display.ts).
	return {
		household,
		me,
		home: locals.home,
		sampleMode: locals.sampleMode,
		ai: aiConfigured,
		requestsWaiting,
		unread,
		pushKey: pushPublicKey(),
		display: locals.display
	};
};
