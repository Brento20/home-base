import { fail, redirect } from '@sveltejs/kit';
import { getPost } from '#lib/features/feed/feed.server.js';
import { draftFromPost } from '#lib/features/feed/plan-draft.js';
import { createPlan, parsePlanForm } from '#lib/features/plans/plans.server.js';
import { isValidDateISO, todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const requested = url.searchParams.get('date') ?? '';
	const date = isValidDateISO(requested) ? requested : todayISO();

	// "Create event" on a feed post: start from the post, and keep the link when it's saved.
	const postId = url.searchParams.get('post');
	if (!postId) return { date, fromPost: null };
	const post = await getPost(locals, postId);
	return { date, fromPost: { id: post.id, ...draftFromPost(post.body) } };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const { input, errors, values, valid } = parsePlanForm(form);
		const postId = String(form.get('postId') ?? '') || null;
		if (!valid || !input) return fail(400, { values, errors, postId });

		// Checks the post is still there and in this home before linking to it.
		if (postId) await getPost(locals, postId);
		const id = await createPlan(locals, input, postId);
		redirect(303, `/plans/${id}`);
	}
};
