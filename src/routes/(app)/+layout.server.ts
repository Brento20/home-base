import { countWaitingRequests } from '#lib/features/friends/requests.server.js';
import { getHousehold } from '#lib/features/household/household.server.js';
import { aiConfigured } from '#lib/server/ai.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const [{ household, me }, requestsWaiting] = await Promise.all([
		getHousehold(locals),
		countWaitingRequests(locals)
	]);
	// `ai`: whether the AI helpers show. Without a key they hide and forms work by hand.
	// `home`: its time zone and currency, so the phone shows dates and money as the server does.
	// `requestsWaiting`: friend requests waiting on you, a dot on the Home tab.
	return {
		household,
		me,
		home: locals.home,
		sampleMode: locals.sampleMode,
		ai: aiConfigured,
		requestsWaiting
	};
};
