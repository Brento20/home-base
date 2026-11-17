import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	return {
		sampleMode: locals.sampleMode,
		notice:
			url.searchParams.get('link') === 'expired'
				? 'That link has expired or was already used. Sign in, or ask for a new one.'
				: null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.supabase) redirect(303, '/');

		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!email || !password) return fail(400, { email, message: 'Enter your email and password.' });

		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error?.code === 'email_not_confirmed')
			return fail(400, { email, message: 'Confirm your email first. The link is in your inbox.' });
		if (error) return fail(400, { email, message: 'That email and password don’t match.' });

		// The hook sends them on to wherever they're up to: profile, welcome, or Today.
		redirect(303, '/');
	}
};
