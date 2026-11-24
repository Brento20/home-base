/**
 * Display preferences on the phone. The server sends yours with every page (the app layout's
 * `display`), already applied to the first paint. Changing one on Preferences shows straight
 * away: `setDisplay` keeps the new set here (it wins over the server's until the next full
 * load), flips what the page shell shows (`data-glow`), steadies placeholders and headings, and
 * saves to your profile a moment later. Nothing here is written on the server, so one person's
 * choice can never reach another's page.
 */
import { browser } from '$app/env';
import { setSteady } from '#lib/copy/pick.js';
import type { DisplayPrefs } from './display.js';

let chosen = $state<DisplayPrefs | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

/** Yours: what you just chose, or what the server sent. */
export function displayPrefs(fromServer: DisplayPrefs): DisplayPrefs {
	return chosen ?? fromServer;
}

/** Applies them to this page: the glow switch on <html>, and steady words. */
export function applyDisplay(prefs: DisplayPrefs) {
	if (!browser) return;
	document.documentElement.dataset.glow = prefs.reduceGlow ? 'low' : 'full';
	setSteady(prefs.staticPlaceholders);
}

export function setDisplay(prefs: DisplayPrefs) {
	chosen = prefs;
	applyDisplay(prefs);
	clearTimeout(timer);
	// A few taps in a row are one save.
	timer = setTimeout(() => {
		fetch('/account/display', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ prefs })
		}).catch(() => {
			// Offline: it's on screen now; the next change tries again.
		});
	}, 400);
}
