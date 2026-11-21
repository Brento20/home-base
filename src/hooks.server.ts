import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { redirectFor, stageFor } from '#lib/features/account/stage.js';
import { DEFAULT_HOME, homeFrom, setHomeSettingsSource, type HomeSettings } from '#lib/home.js';
import { getRequestEvent } from '$app/server';
import { sampleHome } from '#lib/server/sample-home.js';
import { RequestTiming } from '#lib/server/timing.js';
import { createSupabaseServerClient, supabaseConfigured } from '#lib/server/supabase.js';
import { daypartAt } from '#lib/ui/daypart.js';
import {
	paletteFor,
	parseTheme,
	serialiseTheme,
	THEME_COOKIE,
	THEME_MAX_AGE,
	themeCss,
	themeScript,
	type ThemeChoice
} from '#lib/ui/theme.js';

/**
 * Sent with every page: no sniffing file types, no embedding the app in someone else's frame
 * (clickjacking), only the origin in referrers, no camera, microphone or location access
 * (photos come from the file picker, which doesn't need it), and HTTPS only.
 */
const SECURITY_HEADERS = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
	// HTTPS only from now on, for a year; the Content-Security-Policy comes from vite.config.ts.
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

const THEME_CSS = themeCss();
// Dates and money anywhere on the server follow the home of the request being served.
setHomeSettingsSource(() => {
	try {
		return getRequestEvent().locals.home ?? DEFAULT_HOME;
	} catch {
		return DEFAULT_HOME; // Outside a request: nothing to go on but the default.
	}
});

/**
 * Writes this device's appearance into the page shell (app.html): the theme colours, the inline
 * script that picks the one for the time of day, light or dark, and the iPhone status bar to suit.
 */
function themed(theme: ThemeChoice, home: HomeSettings) {
	const ground = paletteFor(theme, daypartAt())[theme.mode].ground;
	return {
		transformPageChunk: ({ html }: { html: string }) =>
			html
				.replace('%hb.themecss%', THEME_CSS)
				// The colours follow the time of day where the home is.
				.replace('%hb.themescript%', themeScript(home.timeZone))
				.replaceAll('%hb.mode%', theme.mode)
				.replace('%hb.ground%', ground)
				.replace('%hb.statusbar%', theme.mode === 'light' ? 'default' : 'black-translucent')
	};
}

/**
 * The theme to draw with: this device's cookie, or, when it's been cleared (or it's a new
 * phone), the copy on the person's profile, put back in the cookie for next time.
 */
async function deviceTheme(event: Parameters<Handle>[0]['event']): Promise<ThemeChoice> {
	const saved = event.cookies.get(THEME_COOKIE);
	const { supabase, user } = event.locals;
	if (saved || !supabase || !user) return parseTheme(saved);

	// Its own small query, so a profile without the column yet (before the migration) can't
	// break signing in; it just falls back to the default look.
	const { data } = await supabase.from('profiles').select('theme').eq('id', user.id).maybeSingle();
	const fromProfile = (data as { theme?: string | null } | null)?.theme;
	if (!fromProfile) return parseTheme(null);
	const theme = parseTheme(fromProfile);
	event.cookies.set(THEME_COOKIE, serialiseTheme(theme), {
		path: '/',
		maxAge: THEME_MAX_AGE,
		sameSite: 'lax',
		// The inline script in app.html reads it, before the page is drawn.
		httpOnly: false,
		secure: event.url.protocol === 'https:'
	});
	return theme;
}

function secure(response: Response) {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
	return response;
}

export const handle: Handle = async ({ event, resolve }) => {
	const { locals } = event;
	locals.sampleMode = !supabaseConfigured;
	const timing = new RequestTiming();
	locals.supabase = supabaseConfigured ? createSupabaseServerClient(event, timing.fetch) : null;
	locals.user = null;
	locals.householdId = null;
	locals.home = DEFAULT_HOME;

	if (!locals.supabase) {
		// Sample data: everything is open, including the sign-up pages, so they can be designed.
		locals.stage = 'ready';
		locals.householdId = 'sample-household';
		locals.home = sampleHome;
		const response = await resolve(
			event,
			themed(parseTheme(event.cookies.get(THEME_COOKIE)), locals.home)
		);
		response.headers.set('server-timing', timing.header());
		return secure(response);
	}

	// getClaims() verifies the session token's signature and expiry against the project's public
	// signing keys (fetched once, then cached), so most requests skip a round trip to Supabase
	// Auth before any data is fetched. It never just trusts the cookie: with the older shared
	// secret keys it asks the auth server instead, as getUser() did. A session signed out on
	// another device lasts until its token expires (an hour at most).
	// Server-Timing's "auth" shows which: near zero is a local check, more is a trip.
	const supabase = locals.supabase;
	const { data } = await timing.span('auth', () => supabase.auth.getClaims());
	const claims = data?.claims;
	locals.user = claims?.sub ? { id: claims.sub, email: claims.email ?? null } : null;

	// One trip for everything a request needs before its page loads: whether you've made a
	// profile, which home you're in, and that home's time zone and currency.
	let onboarded = false;
	if (locals.user) {
		const userId = locals.user.id;
		const { data: profile } = await timing.span('profile', async () =>
			supabase
				.from('profiles')
				.select(
					'onboarded_at, household_members ( household_id, households ( time_zone, currency ) )'
				)
				.eq('id', userId)
				.maybeSingle()
		);

		onboarded = Boolean(profile?.onboarded_at);
		const membership = (profile?.household_members as unknown as Membership[] | undefined)?.[0];
		locals.householdId = membership?.household_id ?? null;
		if (membership?.households) locals.home = homeFrom(membership.households);
	}

	locals.stage = stageFor(locals.user !== null, onboarded, locals.householdId !== null);

	const target = redirectFor(locals.stage, event.route.id);
	if (target && target !== event.url.pathname) redirect(303, target);

	const response = await resolve(event, {
		...themed(await deviceTheme(event), locals.home),
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
	response.headers.set('server-timing', timing.header());
	return secure(response);
};

interface Membership {
	household_id: string;
	households: { time_zone: string | null; currency: string | null } | null;
}
