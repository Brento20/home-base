import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		if (!locals.supabase) redirect(303, '/');

		const email = String((await request.formData()).get('email') ?? '').trim();
		if (!email) return fail(400, { email, message: 'Enter your email address.' });

		const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}/auth/confirm?next=/account/password`
		});
		if (error?.code === 'over_email_send_rate_limit')
			return fail(429, { email, message: 'Too many emails have gone out. Try again in an hour.' });
		if (error) console.error(error);

		// The same answer whether or not there's an account for this email.
		return { sent: true, email, message: null };
	}
};
