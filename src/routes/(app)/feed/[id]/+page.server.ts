import { fail, redirect } from '@sveltejs/kit';
import {
	addReply,
	deletePost,
	deleteReply,
	getPost,
	parseReplyForm,
	REPLY_BODY_MAX,
	toggleReaction
} from '#lib/features/feed/feed.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => ({
	post: await getPost(locals, params.id),
	replyMax: REPLY_BODY_MAX
});

/**
 * Everything you can do to a post. Today's feed posts its reactions and deletes here too, so the
 * same rules apply wherever the post is shown.
 */
export const actions: Actions = {
	react: async ({ request, locals, params }) => {
		const reaction = String((await request.formData()).get('reaction') ?? '');
		await toggleReaction(locals, params.id, reaction);
	},

	reply: async ({ request, locals, params }) => {
		const { body, problem } = parseReplyForm(await request.formData());
		if (problem) return fail(400, { reply: body, replyProblem: problem });
		await addReply(locals, params.id, body);
		return { replied: true };
	},

	deleteReply: async ({ request, locals, params }) => {
		const replyId = String((await request.formData()).get('replyId') ?? '');
		if (!replyId) return fail(400, { replyProblem: 'Missing reply.' });
		await deleteReply(locals, params.id, replyId);
	},

	delete: async ({ locals, params, url }) => {
		await deletePost(locals, params.id);
		// From the post's own page there's nothing left to show, so go back to Today.
		const then = url.searchParams.get('then');
		if (then?.startsWith('/') && !then.startsWith('//')) redirect(303, then);
	}
};
