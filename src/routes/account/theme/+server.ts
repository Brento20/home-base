import { json } from '@sveltejs/kit';
import { parseTheme, serialiseTheme } from '#lib/ui/theme.js';
import type { RequestHandler } from './$types';

/**
 * Saves your appearance to your profile, so it comes back if this phone's cookies are cleared
 * and on any other phone you sign in on. The browser keeps its own copy (cookie and
 * localStorage) and paints from that; this is the backup. Never fails loudly: the theme is
 * already on screen and saved on the device.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { supabase, user } = locals;
	if (!supabase || !user) return json({ saved: false });

	const body = (await request.json().catch(() => null)) as { theme?: unknown } | null;
	const theme = serialiseTheme(parseTheme(typeof body?.theme === 'string' ? body.theme : ''));
	const { error } = await supabase.from('profiles').update({ theme }).eq('id', user.id);
	if (error) console.error('Saving the theme failed', error.message);
	return json({ saved: !error });
};
