import { fail, redirect } from '@sveltejs/kit';
import { createPost, parsePostForm, POST_BODY_MAX } from '#lib/features/feed/feed.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ maxLength: POST_BODY_MAX });

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { body, photo, errors, valid } = parsePostForm(await request.formData());
		if (!valid) return fail(400, { body, errors });

		await createPost(locals, { body, photo });
		// Back to Today, where the new post is at the top of the feed.
		redirect(303, '/');
	}
};
