import { fail, redirect } from '@sveltejs/kit';
import { blockPerson, listFriends } from '#lib/features/friends/friends.server.js';
import {
	addPostcardReply,
	deletePostcardReply,
	getPostcard,
	parsePostcardReply,
	POSTCARD_REPLY_MAX,
	removePostcard,
	setPostcardReaction
} from '#lib/features/friends/postcards.server.js';
import { myId } from '#lib/features/household/household.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const [postcard, friends] = await Promise.all([
		getPostcard(locals, params.id),
		listFriends(locals)
	]);
	const card = postcard.postcard!;
	const mine = card.profileId === myId(locals);
	// Sent by you: who it went to. Sent to you: whether you can send one back (still friends,
	// still in a home).
	const other = friends.find((friend) => friend.id === (mine ? card.toProfileId : card.profileId));
	return {
		postcard,
		mine,
		otherName: other?.name ?? null,
		canSendBack: !mine && Boolean(other?.homeName),
		replyMax: POSTCARD_REPLY_MAX
	};
};

/** Everything you can do to a postcard. The feed's reaction bar posts here too. */
export const actions: Actions = {
	react: async ({ request, locals, params }) => {
		const reaction = String((await request.formData()).get('reaction') ?? '');
		await setPostcardReaction(locals, params.id, reaction);
	},

	reply: async ({ request, locals, params }) => {
		const { body, problem } = parsePostcardReply(await request.formData());
		if (problem) return fail(400, { replyProblem: problem });
		await addPostcardReply(locals, params.id, body);
		return { replied: true };
	},

	deleteReply: async ({ request, locals, params }) => {
		const replyId = String((await request.formData()).get('replyId') ?? '');
		if (!replyId) return fail(400, { replyProblem: 'Missing reply.' });
		await deletePostcardReply(locals, params.id, replyId);
	},

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
