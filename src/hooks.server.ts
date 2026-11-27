import { redirect } from '@sveltejs/kit';
import { forgetFriendLink, savedFriendLink } from '#lib/features/friends/friend-cookie.server.js';
import type { Handle } from '@sveltejs/kit/hooks';
import { redirectFor, stageFor } from '#lib/features/account/stage.js';
import { deliverPushes } from '#lib/features/notifications/notifications.server.js';
import { DEFAULT_HOME, homeFrom, setHomeSettingsSource, type HomeSettings } from '#lib/home.js';
import { background } from '#lib/server/background.js';
import { DEFAULT_DISPLAY, DISPLAY_COOKIE, parseDisplay, type DisplayPrefs } from '#lib/display.js';
import { householdFrom, MEMBER_COLUMNS } from '#lib/features/household/members.js';
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
 * script that picks the one for the time of day, light or dark, the iPhone status bar to suit,
 * and whether this person has turned the glows down (display preferences).
 */
function themed(theme: ThemeChoice, home: HomeSettings, display: DisplayPrefs) {
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
				.replace('%hb.glow%', display.reduceGlow ? 'low' : 'full')
	};
}

/**
 * The theme to draw with: this device's cookie, or, when it's been cleared (or it's a new
 * phone), the copy on the person's profile (read with it in the handle below), put back in the
 * cookie for next time.
 */
function deviceTheme(
	event: Parameters<Handle>[0]['event'],
	fromProfile: string | null | undefined
): ThemeChoice {
	const saved = event.cookies.get(THEME_COOKIE);
	if (saved || !fromProfile) return parseTheme(saved ?? null);
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
	locals.household = null;
	locals.home = DEFAULT_HOME;
	locals.display = DEFAULT_DISPLAY;

	if (!locals.supabase) {
		// Sample data: everything is open, including the sign-up pages, so they can be designed.
		locals.stage = 'ready';
		locals.householdId = 'sample-household';
		locals.home = sampleHome;
		// No database to keep them in: sample mode keeps display preferences in a cookie.
		locals.display = readDisplayCookie(event.cookies.get(DISPLAY_COOKIE));
		const response = await resolve(
			event,
			themed(parseTheme(event.cookies.get(THEME_COOKIE)), locals.home, locals.display)
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
	// profile, your saved theme, which home you're in, its time zone and currency, and (for
	// page loads) its name and everyone in it, so the layout and pages don't each ask again.
	// Form actions skip the people: an action may change them, and its own reads stay current.
	let onboarded = false;
	let savedTheme: string | null | undefined;
	if (locals.user) {
		const userId = locals.user.id;
		const withPeople = event.request.method === 'GET';
		const { data: profile } = await timing.span('profile', async () => {
			const answer = await supabase
				.from('profiles')
				.select(profileColumns(withPeople, true))
				.eq('id', userId)
				.maybeSingle();
			// Before the theme migration, ask again without it rather than fail signing in.
			if (answer.error?.code !== '42703') return answer;
			return supabase
				.from('profiles')
				.select(profileColumns(withPeople, false))
				.eq('id', userId)
				.maybeSingle();
		});
		const row = profile as ProfileLookup | null;

		onboarded = Boolean(row?.onboarded_at);
		savedTheme = row?.theme;
		locals.display = parseDisplay(row?.display_prefs);
		const membership = row?.household_members?.[0];
		locals.householdId = membership?.household_id ?? null;
		if (membership?.households) {
			locals.home = homeFrom(membership.households);
			const { id, name, household_members: people } = membership.households;
			if (withPeople && id && name && people) {
				locals.household = householdFrom({ id, name }, people, userId);
			}
		}
	}

	locals.stage = stageFor(locals.user !== null, onboarded, locals.householdId !== null);

	const target = redirectFor(locals.stage, event.route.id);
	if (target && target !== event.url.pathname) redirect(303, target);

	// A friend link opened before you could accept it (signed out, say): back to it now you can.
	const friendLink = savedFriendLink(event.cookies);
	if (
		friendLink &&
		(locals.stage === 'ready' || locals.stage === 'home') &&
		event.request.method === 'GET' &&
		!event.route.id?.startsWith('/friend/')
	) {
		forgetFriendLink(event.cookies);
		redirect(303, `/friend/${friendLink}`);
	}

	const response = await resolve(event, {
		...themed(deviceTheme(event, savedTheme), locals.home, locals.display),
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
	response.headers.set('server-timing', timing.header());
	// Anything you just did that someone should hear about goes to their phones now, after the
	// response (src/lib/features/notifications/notifications.server.ts).
	if (event.request.method !== 'GET' && locals.user) {
		background('push', deliverPushes(locals));
	}
	return secure(response);
};

function readDisplayCookie(value: string | undefined): DisplayPrefs {
	try {
		return parseDisplay(value ? JSON.parse(value) : null);
	} catch {
		return DEFAULT_DISPLAY;
	}
}

/** The profile lookup's columns: with the home's people for page loads, theme once migrated. */
const profileColumns = (withPeople: boolean, withTheme: boolean) =>
	[
		'onboarded_at, display_prefs',
		withTheme ? 'theme' : null,
		`household_members ( household_id, households ( time_zone, currency${
			withPeople ? `, id, name, household_members ( ${MEMBER_COLUMNS} )` : ''
		} ) )`
	]
		.filter(Boolean)
		.join(', ');

interface ProfileLookup {
	onboarded_at: string | null;
	display_prefs: unknown;
	theme?: string | null;
	household_members?: Membership[];
}

interface Membership {
	household_id: string;
	households: {
		time_zone: string | null;
		currency: string | null;
		id?: string;
		name?: string;
		household_members?: Parameters<typeof householdFrom>[1];
	} | null;
}
