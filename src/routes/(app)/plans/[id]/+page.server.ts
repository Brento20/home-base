import { fail } from '@sveltejs/kit';
import { listFriends } from '#lib/features/friends/friends.server.js';
import {
	addFriendFromPlan,
	inviteFriend,
	listGuests,
	respond,
	uninviteHome
} from '#lib/features/plans/plan-invites.server.js';
import { getPlan } from '#lib/features/plans/plans.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const [plan, guests, friends] = await Promise.all([
		getPlan(locals, params.id),
		listGuests(locals, params.id),
		listFriends(locals)
	]);
	// Friends whose homes this plan could still invite (your own plans only).
	const invited = new Set((plan.guestHomes ?? []).map((home) => home.name));
	const invitable = plan.invitedBy
		? []
		: friends.filter((friend) => friend.homeName && !invited.has(friend.homeName));
	return { plan, guests, invitable, today: todayISO() };
};

const field = async (request: Request, name: string) =>
	String((await request.formData()).get(name) ?? '');

/** Answering, inviting friends' homes, and adding someone you went with as a friend. */
export const actions: Actions = {
	respond: async ({ request, locals, params }) => {
		await respond(locals, params.id, await field(request, 'answer'));
	},

	invite: async ({ request, locals, params }) => {
		const { message } = await inviteFriend(locals, params.id, await field(request, 'friend'));
		if (message) return fail(400, { message });
	},

	uninvite: async ({ request, locals, params }) => {
		const { message } = await uninviteHome(locals, params.id, await field(request, 'home'));
		if (message) return fail(400, { message });
	},

	addFriend: async ({ request, locals, params }) => {
		const { message } = await addFriendFromPlan(locals, params.id, await field(request, 'person'));
		if (message) return fail(400, { message });
		return { added: true };
	}
};
