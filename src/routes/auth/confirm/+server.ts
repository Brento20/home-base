import { redirect } from '@sveltejs/kit';
import type { EmailOtpType } from '@supabase/supabase-js';
import { safeNext } from '#lib/features/account/account.server.js';
import type { RequestHandler } from './$types';

/**
 * Where links in sign-up and password emails land. Handles both kinds of link Supabase can send:
 * a one-time code (the default email templates) or a token hash (custom templates that link here
 * directly). Either way the session is created on the server and saved in cookies.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.supabase) redirect(303, '/');

	const next = safeNext(url.searchParams.get('next'));
	const code = url.searchParams.get('code');
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as EmailOtpType | null;

	let ok = false;
	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		ok = !error;
	} else if (tokenHash && type) {
		const { error } = await locals.supabase.auth.verifyOtp({ type, token_hash: tokenHash });
		ok = !error;
	}

	redirect(303, ok ? next : '/login?link=expired');
};
