import { afterNavigate } from '$app/navigation';
import { tabIndexFor } from './tabs.js';

/**
 * Page changes, as light as they can be.
 *
 * Switching tabs is instant, as in the phone's own apps: the tab bar's pill is the motion.
 * Going deeper (opening a plan, starting a list) slides the new page in a little from the
 * right; coming back slides it in from the left. Nothing else animates: no fades, no
 * snapshots of the old page, nothing running while the next page's data loads.
 *
 * The slide is one short transform on the element marked `data-page`, through the Web
 * Animations API, so the phone's compositor runs it without repainting. Call once, from the
 * root layout.
 */

type Direction = 'tab' | 'push' | 'pop' | 'none';

const SLIDE_MS = 260;
const SLIDE_PX = { push: 40, pop: -32 };
const EASE_OUT = 'cubic-bezier(0.22, 0.9, 0.3, 1)';

export function usePageTransitions() {
	afterNavigate((navigation) => {
		const { from, to } = navigation;
		if (!from || !to || from.url.pathname === to.url.pathname) return;
		const page = document.querySelector<HTMLElement>('[data-page]');
		if (!page) return;

		// A swipe leaves the page where the finger let go; put it back as the new page arrives.
		page.style.transition = '';
		page.style.translate = '';

		const direction = directionFor(from.url.pathname, to.url.pathname);
		if (direction !== 'push' && direction !== 'pop') return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		page.animate([{ transform: `translateX(${SLIDE_PX[direction]}px)` }, { transform: 'none' }], {
			duration: SLIDE_MS,
			easing: EASE_OUT
		});
	});
}

const depth = (pathname: string) => pathname.split('/').filter(Boolean).length;

export function directionFor(fromPath: string, toPath: string): Direction {
	const fromTab = tabIndexFor(fromPath);
	const toTab = tabIndexFor(toPath);
	if (fromTab >= 0 && toTab >= 0 && fromTab !== toTab) return 'tab';
	if (fromTab >= 0 && fromTab === toTab) {
		const change = depth(toPath) - depth(fromPath);
		return change > 0 ? 'push' : change < 0 ? 'pop' : 'none';
	}
	return 'none';
}
