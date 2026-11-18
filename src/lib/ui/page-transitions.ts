import { afterNavigate, beforeNavigate } from '$app/navigation';
import { tabIndexFor } from './tabs.js';

/**
 * Page changes, kept cheap enough for an older iPhone and quick enough to feel instant.
 *
 * The page you're leaving starts moving the moment you tap: it eases a few pixels away from the
 * direction of travel and dims while the next page's data loads. As soon as the new page is in
 * place it springs in from the other side and fades up. Between tabs it slides from the side of
 * the tab you tapped; going deeper pushes in from the right; going back comes in from the left;
 * anything else just fades.
 *
 * What makes it cheap: only the page element moves, and only its transform and opacity, through
 * the Web Animations API, so the phone's compositor does the work without repainting. There are
 * no View Transitions: those take a picture of the whole old page (with all its frosted glass)
 * before anything can move, and keep re-rendering the new one while it animates.
 *
 * The element that moves is the one marked `data-page` (the app's <main>, or a solo screen).
 * A swipe hands over mid-gesture: the page stays where your finger left it and carries on from
 * there. Query-only changes (a report's month) don't move the page. Call once, from the root
 * layout.
 */

type Direction = 'tab-forward' | 'tab-back' | 'push' | 'pop' | 'fade';

/** Where the old page heads as it leaves, and where the new one comes in from, in px. */
const MOTION: Record<Direction, { leave: number; enter: number }> = {
	'tab-forward': { leave: -12, enter: 28 },
	'tab-back': { leave: 12, enter: -28 },
	push: { leave: -16, enter: 36 },
	pop: { leave: 16, enter: -28 },
	fade: { leave: 0, enter: 0 }
};

const LEAVE_MS = 160;
const ENTER_MS = 340;
const FADE_MS = 170;
/** A spring that starts fast, overshoots by about 3% and settles: most of the move is done in 120ms. */
const QUICK_SPRING =
	'linear(0, 0.121, 0.239, 0.352, 0.457, 0.552, 0.637, 0.712, 0.777, 0.832, 0.878, 0.916, 0.946, 0.97, 0.989, 1.003, 1.013, 1.02, 1.025, 1.027, 1.028, 1.027, 1.026, 1.024, 1.022, 1.02, 1.017, 1.015, 1.013, 1.011, 1.009, 1.007, 1.006, 1.004, 1)';
const QUICK_FALLBACK = 'cubic-bezier(0.2, 0.9, 0.3, 1.04)';

const pageElement = () => document.querySelector<HTMLElement>('[data-page]');

export function usePageTransitions() {
	let direction: Direction | null = null;
	let leaving: Animation | null = null;
	// Runs during the server render too, so browser-only checks wait for the first navigation.
	const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
	const spring = () =>
		CSS.supports('animation-timing-function', QUICK_SPRING) ? QUICK_SPRING : QUICK_FALLBACK;

	function stopLeaving() {
		leaving?.cancel();
		leaving = null;
	}

	beforeNavigate((navigation) => {
		const { from, to } = navigation;
		if (!from || !to || navigation.willUnload) return;
		if (from.url.pathname === to.url.pathname) return;

		direction = reduced() ? 'fade' : directionFor(from.url.pathname, to.url.pathname);
		const page = pageElement();
		stopLeaving();
		if (page) {
			leaving = page.animate(
				[{ transform: `translateX(${MOTION[direction].leave}px)`, opacity: 0.55 }],
				{
					duration: LEAVE_MS,
					easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)',
					fill: 'forwards'
				}
			);
		}
		// A navigation that fails or is cancelled puts the page back.
		navigation.complete.catch(() => {
			stopLeaving();
			direction = null;
		});
	});

	afterNavigate(() => {
		if (!direction) return;
		const { enter } = MOTION[direction];
		direction = null;
		stopLeaving();
		const page = pageElement();
		if (!page) return;
		// A swipe leaves the page where the finger let go; the entrance takes over from here.
		page.style.transition = '';
		page.style.translate = '';
		if (enter) {
			page.animate([{ transform: `translateX(${enter}px)` }, { transform: 'none' }], {
				duration: ENTER_MS,
				easing: spring()
			});
		}
		page.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: FADE_MS,
			easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)'
		});
	});
}

const depth = (pathname: string) => pathname.split('/').filter(Boolean).length;

export function directionFor(fromPath: string, toPath: string): Direction {
	const fromTab = tabIndexFor(fromPath);
	const toTab = tabIndexFor(toPath);
	if (fromTab >= 0 && toTab >= 0 && fromTab !== toTab)
		return toTab > fromTab ? 'tab-forward' : 'tab-back';
	if (fromTab >= 0 && fromTab === toTab) {
		const change = depth(toPath) - depth(fromPath);
		return change > 0 ? 'push' : change < 0 ? 'pop' : 'fade';
	}
	return 'fade';
}
