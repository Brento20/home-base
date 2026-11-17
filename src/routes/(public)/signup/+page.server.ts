import { fail, redirect } from '@sveltejs/kit';
import { CHECK_EMAIL, parseCredentials } from '#lib/features/account/account.server.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		if (!locals.supabase) redirect(303, '/setup/profile');

		const { email, password, errors, valid } = parseCredentials(await request.formData());
		if (!valid) return fail(400, { email, errors, message: null });

		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: { emailRedirectTo: `${url.origin}/auth/confirm?next=/setup/profile` }
		});

		if (error) {
			if (error.code === 'weak_password')
				return fail(400, {
					email,
					errors: { password: 'Pick a stronger password.' },
					message: null
				});
			if (error.code === 'over_email_send_rate_limit')
				return fail(429, {
					email,
					errors: {},
					message: 'Too many emails have gone out. Try again in an hour.'
				});
			if (error.code === 'signup_disabled')
				return fail(403, { email, errors: {}, message: 'Sign-ups are closed right now.' });
			if (error.code !== 'user_already_exists') {
				console.error(error);
				return fail(500, { email, errors: {}, message: 'Something went wrong. Try again.' });
			}
		}

		// Email confirmation turned off in Supabase: they're signed in already.
		if (data.session) redirect(303, '/setup/profile');

		return { sent: true, email, message: CHECK_EMAIL };
	}
};
