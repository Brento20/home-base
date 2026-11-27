import { LIVE_DATA } from '#lib/live-data.js';
import { refresh as reload } from './save.svelte.js';

/**
 * Keeps everyone's phones in step without a realtime connection: reloads everything when the
 * app comes back to the foreground (and on pull to refresh, in AppGestures), and every minute
 * just the live screens (LIVE_DATA) while the app is open and showing.
 * Returns a cleanup function.
 */
export function startLiveRefresh(intervalMs = 60_000, onLoaded: (done: () => void) => () => void) {
	let lastRefresh = Date.now();
	let running = false;

	async function refresh(fromForeground = false) {
		// Don't pull data out from under someone mid-edit.
		const active = document.activeElement;
		if (running || document.visibilityState !== 'visible') return;
		// A page just opened has fresh data already: wait until it's had a full interval.
		if (!fromForeground && Date.now() - lastRefresh < intervalMs - 1_000) return;
		if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
		running = true;
		try {
			// Shared with saves' reloads, and only done once streamed data has landed too, so
			// `running` covers the whole refresh and two can't overlap.
			await reload(fromForeground ? 'all' : [LIVE_DATA]);
			lastRefresh = Date.now();
		} finally {
			running = false;
		}
	}

	const onVisible = () => {
		if (document.visibilityState === 'visible' && Date.now() - lastRefresh > 2_000) refresh(true);
	};

	// Every page load counts as a refresh, so the timer skips pages that were just loaded.
	const unsubscribe = onLoaded(() => (lastRefresh = Date.now()));

	document.addEventListener('visibilitychange', onVisible);
	window.addEventListener('focus', onVisible);
	const timer = setInterval(() => refresh(), intervalMs);

	return () => {
		document.removeEventListener('visibilitychange', onVisible);
		window.removeEventListener('focus', onVisible);
		clearInterval(timer);
		unsubscribe();
	};
}
