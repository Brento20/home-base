import { onNavigate } from '$app/navigation';
import { tabIndexFor } from './tabs.js';

/**
 * Animates page changes with the View Transitions API (base.css has the motion):
 *   - between tabs, the new page slides in from the side of the tab you tapped;
 *   - within a tab, going deeper pushes in from the right and going back pops in from the left;
 *   - anything else (sign up, setup) crossfades.
 * Query-only changes (a report's month or category) don't animate the whole page. Browsers
 * without view transitions just swap pages as before. Call once, from the root layout.
 */
let settled: Promise<void> = Promise.resolve();

/**
 * Resolves once the current page transition has finished (straight away when none is running).
 * Glass waits for it: building glass mid-slide blocks the frames that move the page.
 */
export function transitionSettled() {
	return settled;
}

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
			});
			settled = transition.finished.then(
				() => undefined,
				() => undefined
			);
			transition.finished.finally(() => delete root.dataset.nav);
		});
	});
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
