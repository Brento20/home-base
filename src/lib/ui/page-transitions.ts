import { onNavigate, preloadCode } from '$app/navigation';
import { TABS, tabIndexFor } from './tabs.js';

/**
 * Smooth slides between screens, with the View Transitions API (motion in base.css).
 *
 *   - Between tabs, the new screen glides in from the side of the tab you picked while the old
 *     one drifts the other way and fades.
 *   - Going deeper (a plan, a list, a post) pushes in from the right; coming back comes in from
 *     the left.
 *   - Anything else (sign up, setup) crossfades.
 *
 * Only the element marked `data-page` moves; the backdrop and tab bar stay put, and the tab
 * pill sets off the moment you tap. It stays light because nothing on the page is a live
 * filter: the browser takes one flat picture of the old screen and slides two layers, which
 * the phone's compositor does without repainting. (It was slow before because the old screen
 * was full of liquid-glass filters, each redrawn for that picture.)
 *
 * The transition can only start once the next screen's data has arrived, so screens are
 * fetched ahead: every tab's code loads shortly after the app opens, a link's data starts
 * loading the moment a finger touches it, and a swipe starts loading where it's heading as
 * soon as it's recognised (AppGestures). A swipe hands over mid-gesture: the old screen
 * leaves from where your finger let go.
 *
 * Browsers without view transitions swap screens instantly. Query-only changes (a report's
 * month) don't animate. Call once, from the root layout.
 */
export function usePageTransitions() {
	onNavigate((navigation) => {
		const { from, to } = navigation;
		if (!document.startViewTransition || !from || !to) return;
		if (from.url.pathname === to.url.pathname) return;

		const root = document.documentElement;
		root.dataset.nav = directionFor(from.url.pathname, to.url.pathname);

		return new Promise<void>((resolve) => {
			const transition = document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
				// A swipe leaves the old screen where the finger let go (it's in the picture now);
				// the new one starts from its proper place.
				const page = document.querySelector<HTMLElement>('[data-page]');
				if (page) {
					page.style.transition = '';
					page.style.translate = '';
				}
			});
			transition.finished.finally(() => delete root.dataset.nav);
		});
	});
}

/** Loads every tab's code in a quiet moment after the app opens, so the first visit is quick. */
export function preloadTabs() {
	type Path = Parameters<typeof preloadCode>[0];
	const load = () => TABS.forEach((tab) => preloadCode(tab.href as Path).catch(() => {}));
	if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 3000 });
	else setTimeout(load, 1500);
}

const depth = (pathname: string) => pathname.split('/').filter(Boolean).length;

export function directionFor(fromPath: string, toPath: string) {
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
