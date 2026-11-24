import { json } from '@sveltejs/kit';
import { DISPLAY_COOKIE, parseDisplay } from '#lib/display.js';
import type { RequestHandler } from './$types';

/**
 * Saves your display preferences to your profile, so they follow you to any phone you sign in
 * on and never change anyone else's. The screen has already changed by the time this runs
 * (src/lib/display.svelte.ts). Only recognised values are kept.
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const body = (await request.json().catch(() => null)) as { prefs?: unknown } | null;
	const prefs = parseDisplay(body?.prefs);

	if (!locals.supabase) {
		// Sample mode: a cookie stands in for the profile.
		cookies.set(DISPLAY_COOKIE, JSON.stringify(prefs), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 31_536_000
		});
		return json({ saved: true });
	}
	if (!locals.user) return json({ saved: false }, { status: 401 });

	const { error } = await locals.supabase
		.from('profiles')
		.update({ display_prefs: prefs })
		.eq('id', locals.user.id);
	if (error) console.error('Saving display preferences failed', error.message);
	return json({ saved: !error }, { status: error ? 500 : 200 });
};
