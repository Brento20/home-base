import { fail, redirect } from '@sveltejs/kit';
import { PASSWORD_MIN } from '#lib/features/account/account.server.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.supabase) redirect(303, '/');

		const password = String((await request.formData()).get('password') ?? '');
		if (password.length < PASSWORD_MIN)
			return fail(400, { message: `Use at least ${PASSWORD_MIN} characters.` });

		const { error } = await locals.supabase.auth.updateUser({ password });
		if (error?.code === 'same_password')
			return fail(400, { message: 'That’s your current password. Pick a new one.' });
		if (error?.code === 'weak_password') return fail(400, { message: 'Pick a stronger password.' });
		if (error) {
			console.error(error);
			return fail(500, { message: 'Something went wrong. Try again.' });
		}

		redirect(303, '/');
	}
};
