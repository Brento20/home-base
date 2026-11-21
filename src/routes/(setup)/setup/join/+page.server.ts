import { fail, redirect } from '@sveltejs/kit';
import { tokenFromInvite } from '#lib/features/homes/invites.js';
import type { Actions } from './$types';

/** For a link opened somewhere else (another browser, a laptop): paste it here. */
export const actions: Actions = {
	default: async ({ request }) => {
		const link = String((await request.formData()).get('link') ?? '');
		const token = tokenFromInvite(link);
		if (!token)
			return fail(400, { link, errors: { link: 'That doesn’t look like an invite link.' } });
		redirect(303, `/join/${token}`);
	}
};
