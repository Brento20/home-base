import { fail, redirect } from '@sveltejs/kit';
import {
	getAccountDetails,
	parseProfileForm,
	saveProfile,
	withSavedDetails
} from '#lib/features/account/account.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	account: await getAccountDetails(locals),
	today: todayISO()
});

export const actions: Actions = {
	/** The private half: names, pronouns and birthday. The photo and colour stay as they are. */
	default: async ({ request, locals }) => {
		const form = await request.formData();
		// This page doesn't change the photo, whatever's posted.
		form.delete('photo');
		form.delete('removePhoto');
		form.delete('accentColour');
		form.delete('bio');
		const saved = await getAccountDetails(locals);
		const { values, photo, removePhoto, errors, valid } = parseProfileForm(
			withSavedDetails(form, saved)
		);
		// A problem in the other half (a nickname that's too long) is fixed in Edit profile.
		if ('nickname' in errors)
			return fail(400, {
				values,
				errors: {
					...errors,
					firstName: errors.firstName ?? 'Your nickname needs a look in Edit profile.'
				}
			});
		if (!valid) return fail(400, { values, errors });
		await saveProfile(locals, values, photo, removePhoto, 'details');
		redirect(303, '/profile');
	}
};
