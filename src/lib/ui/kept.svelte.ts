import { browser } from '$app/env';
import { KEPT_COOKIE } from '#lib/kept-hint.js';

/**
 * The last version of each screen this phone has shown, so going back to a tab shows what was
 * there straight away and the fresh data updates it in place (with the animations in
 * src/lib/ui/motion.ts) rather than the slide waiting for the server.
 *
 * A loader returns a screen's data either as the value (it arrived in time) or as a promise
 * still on its way (src/lib/server/soon.ts). `kept` turns either into one steady value:
 *
 *   const screen = kept(() => 'today', () => data.screen);
 *   screen.current  // the freshest data there is: this load's, or the last copy, or undefined
 *   screen.waiting  // fresh data is still on its way
 *   screen.failed   // it couldn't be fetched (what's showing, if anything, is the last copy)
 *
 * Copies live in memory for this session only: nothing is written to the phone's storage.
 */

// A plain record, not a reactive Map: the copies themselves never drive rendering.
const copies: Record<string, unknown> = Object.create(null);

function tellServer() {
	document.cookie = `${KEPT_COOKIE}=${Object.keys(copies).join('.')}; path=/; samesite=lax`;
}

// A fresh start has no copies, whatever the cookie says from last time.
if (browser) document.cookie = `${KEPT_COOKIE}=; path=/; max-age=0; samesite=lax`;

function remember(key: string, value: unknown) {
	if (!key || value == null) return;
	const known = key in copies;
	copies[key] = value;
	if (browser && !known) tellServer();
}

const isPromise = <T>(value: T | Promise<T>): value is Promise<T> =>
	typeof (value as Promise<T>)?.then === 'function';

export function kept<T>(key: () => string, source: () => T | Promise<T>) {
	const first = source();
	const firstKey = key();
	let current = $state<T | undefined>(
		isPromise(first) ? (copies[firstKey] as T | undefined) : first
	);
	let waiting = $state(isPromise(first));
	let failed = $state(false);
	let shownKey = firstKey;
	if (!isPromise(first) && browser) remember(firstKey, first);

	$effect.pre(() => {
		const name = key();
		const incoming = source();
		// Another screen of the same kind (another month): start from its copy, if there is one.
		if (name !== shownKey) {
			shownKey = name;
			current = copies[name] as T | undefined;
		}
		failed = false;
		if (!isPromise(incoming)) {
			current = incoming;
			waiting = false;
			remember(name, incoming);
			return;
		}
		waiting = true;
		let live = true;
		incoming.then(
			(value) => {
				if (!live) return;
				current = value;
				waiting = false;
				remember(name, value);
			},
			() => {
				if (!live) return;
				waiting = false;
				failed = true;
			}
		);
		return () => (live = false);
	});

	return {
		get current() {
			return current;
		},
		get waiting() {
			return waiting;
		},
		get failed() {
			return failed;
		}
	};
}

/** What kept() returns, for components that take one (Reveal.svelte). */
export type Kept<T> = ReturnType<typeof kept<T>>;
