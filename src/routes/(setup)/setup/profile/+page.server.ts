import { fail, redirect } from '@sveltejs/kit';
import {
	getAccountDetails,
	parseProfileForm,
	saveProfile
} from '#lib/features/account/account.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { account: await getAccountDetails(locals), today: todayISO() };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { values, photo, removePhoto, errors, valid } = parseProfileForm(
			await request.formData()
		);
		if (!valid) return fail(400, { values, errors });

		const { photoError } = await saveProfile(locals, values, photo, removePhoto);
		if (photoError) return fail(400, { values, errors: { photo: photoError } });

		redirect(303, locals.householdId && !locals.sampleMode ? '/' : '/setup');
	}
};
