import type { Cookies } from '@sveltejs/kit';
import { KEPT_COOKIE } from '#lib/kept-hint.js';

/**
 * How long a tab's loader waits for its data before letting the slide begin without it.
 *
 *   - A full page load (opening the app, a refresh) waits for everything: the first thing you
 *     see should be the real screen, never placeholders.
 *   - Moving to a tab this phone has already shown (its copy is listed in the kept cookie,
 *     src/lib/ui/kept.svelte.ts): no wait at all. The phone shows its copy and the fresh data
 *     slides in when it lands.
 *   - Moving to a tab for the first time: up to `FIRST_VISIT_MS`. Usually the data is there by
 *     then and the screen arrives whole; on a slow day it arrives as placeholders and fills in.
 */
export const FIRST_VISIT_MS = 150;

export function graceFor(key: string, isDataRequest: boolean, cookies: Cookies) {
	if (!isDataRequest) return Infinity;
	const kept = cookies.get(KEPT_COOKIE)?.split('.') ?? [];
	return kept.includes(key) ? 0 : FIRST_VISIT_MS;
}

/**
 * The value if it arrives within `ms`, otherwise the promise for it (which SvelteKit streams to
 * the page, where kept() picks it up). Wrapped in an object because an async function would
 * otherwise unwrap the promise it returns.
 */
export async function soonOrLater<T>(
	work: Promise<T>,
	ms: number
): Promise<{ value: T } | { later: Promise<T> }> {
	work.catch(() => {}); // a failure shows on the page; don't let it go unhandled here
	if (ms === Infinity) return { value: await work };
	const timeout = Symbol('timeout');
	const first = await Promise.race([
		work,
		new Promise<typeof timeout>((resolve) => setTimeout(() => resolve(timeout), ms))
	]);
	return first === timeout ? { later: work } : { value: first as T };
}

/** For a load's return value: the data itself, or the promise SvelteKit will stream. */
export const unwrap = <T>(soon: { value: T } | { later: Promise<T> }): T | Promise<T> =>
	'value' in soon ? soon.value : soon.later;
