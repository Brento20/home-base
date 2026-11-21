import { fail, redirect } from '@sveltejs/kit';
import {
	getMyPublicProfile,
	parsePublicProfileForm,
	saveMyPublicProfile
} from '#lib/features/friends/public-profile.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	values: await getMyPublicProfile(locals)
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { values, problem } = parsePublicProfileForm(await request.formData());
		if (problem) return fail(400, { values, problem });
		await saveMyPublicProfile(locals, values);
		redirect(303, '/profile');
	}
};
