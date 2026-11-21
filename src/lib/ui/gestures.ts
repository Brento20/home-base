/**
 * What an app-style gesture means on a given page (AppGestures.svelte does the tracking).
 *
 * - On a tab's own page, swiping left goes to the next tab and swiping right to the previous
 *   one, in tab bar order.
 * - Anywhere deeper (a plan, a list, adding something), swiping right goes back.
 * - Pulling down from the top refreshes.
 */

import { TABS, isTabView, tabIndexFor } from './tabs.js';

export type SwipeAction =
	| { kind: 'tab'; href: string; label: string; direction: 'next' | 'previous' }
	| { kind: 'back'; fallback: string };

/** Is this one of the tab bar's own pages? */
export const isTabRoot = (pathname: string) => isTabView(pathname);

/**
 * The action for a horizontal swipe. `dx` is the finger's travel: negative is a swipe to the
 * left. Null when there's nothing that way (swiping right on Today, left on a deeper page).
 */
export function swipeAction(pathname: string, dx: number): SwipeAction | null {
	const index = tabIndexFor(pathname);
	if (isTabRoot(pathname)) {
		const target = TABS[index + (dx < 0 ? 1 : -1)];
		if (!target) return null;
		return {
			kind: 'tab',
			href: target.href,
			label: target.label,
			direction: dx < 0 ? 'next' : 'previous'
		};
	}
	if (dx <= 0) return null;
	// Back through history when there is some; otherwise up to the tab this page belongs to.
	return { kind: 'back', fallback: TABS[index]?.href ?? '/' };
}

/** Resistance: follows the finger at first, then eases off towards `max`. */
export const rubber = (distance: number, max: number, softness = 1.6) =>
	max * (1 - Math.exp(-Math.abs(distance) / (max * softness)));

/** Tuning, in CSS pixels and pixels per millisecond. */
export const GESTURE = {
	/** Movement before deciding whether this is a swipe, a pull or a scroll. */
	axisLock: 10,
	/** A swipe this long always counts. */
	swipeCommit: 72,
	/** A quick flick counts from this far... */
	flickDistance: 32,
	/** ...at this speed. */
	flickSpeed: 0.45,
	/** Touches this close to the screen's side can swipe even over something that scrolls sideways. */
	edge: 28,
	/** How far the pull indicator travels, and where letting go refreshes. */
	pullMax: 110,
	pullArm: 64,
	/** How far the page follows a swipe. */
	swipeTravel: 44
} as const;
