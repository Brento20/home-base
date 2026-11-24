import { fail, redirect } from '@sveltejs/kit';
import {
	getAccountDetails,
	parseProfileForm,
	PRIVATE_FIELDS,
	saveProfile,
	withSavedDetails
} from '#lib/features/account/account.server.js';
import {
	getMyPublicProfile,
	parsePublicProfileForm,
	saveMyPublicProfile
} from '#lib/features/friends/public-profile.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [account, publicProfile] = await Promise.all([
		getAccountDetails(locals),
		getMyPublicProfile(locals)
	]);
	return { account, publicProfile, today: todayISO() };
};

export const actions: Actions = {
	/** What others see: photo, nickname and colour, then the line about you and five answers. */
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const { values: publicValues, problem } = parsePublicProfileForm(form);

		// The line about you is saved with the public answers, not twice.
		form.delete('bio');
		const saved = await getAccountDetails(locals);
		const { values, photo, removePhoto, errors, valid } = parseProfileForm(
			withSavedDetails(form, saved)
		);
		// The private half isn't on this page and isn't saved from it, so its checks don't count
		// here (an account with no birthday saved can still change its photo).
		for (const name of PRIVATE_FIELDS) delete errors[name];
		const ok = valid || Object.keys(errors).length === 0;
		if (!ok || problem) return fail(400, { values, errors, publicValues, problem });

		const { photoError } = await saveProfile(locals, values, photo, removePhoto, 'profile');
		if (photoError)
			return fail(400, { values, errors: { photo: photoError }, publicValues, problem: null });
		await saveMyPublicProfile(locals, publicValues);
		redirect(303, '/profile');
	}
};
