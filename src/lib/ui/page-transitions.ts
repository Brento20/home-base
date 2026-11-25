import { afterNavigate, onNavigate, preloadCode } from '$app/navigation';
import { match } from '$app/paths';
import { TABS, isViewSwitch, tabIndexFor } from './tabs.js';

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
 * As a screen arrives, its sections fade and rise in one after another, top to bottom (the
 * reveal below), so a screen settles in rather than appearing all at once.
 *
 * Browsers without view transitions swap screens instantly (the reveal still plays).
 * Query-only changes (a report's month) and switching a tab's views (Lists | Tasks) don't
 * animate. Call once, from the root layout.
 */
export function usePageTransitions() {
	onNavigate((navigation) => {
		const { from, to } = navigation;
		if (!document.startViewTransition || !from || !to) return;
		if (from.url.pathname === to.url.pathname) return;
		// Lists | Tasks: the content swaps under a heading and switch that stay put.
		if (isViewSwitch(from.url.pathname, to.url.pathname)) return;

		const root = document.documentElement;
		root.dataset.nav = directionFor(from.url.pathname, to.url.pathname);
		// Where the old screen sits in the window: above the top if you'd scrolled down.
		const oldTop = document.querySelector('[data-page]')?.getBoundingClientRect().top ?? 0;

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
					// The two screens only slide sideways. The page's box doesn't travel from the
					// old screen's place to the new one's (base.css), so the old screen's picture is
					// held where it was, however far down you'd scrolled.
					const newTop = page.getBoundingClientRect().top;
					root.style.setProperty('--page-shift', `${oldTop - newTop}px`);
				}
			});
			transition.finished.finally(() => {
				delete root.dataset.nav;
				root.style.removeProperty('--page-shift');
			});
		});
	});

	afterNavigate((navigation) => {
		const { from, to, type } = navigation;
		// Not on first load: the server-rendered page is already showing, and hiding it to fade
		// it back in would flash.
		if (type === 'enter' || !from || !to || from.url.pathname === to.url.pathname) return;
		if (isViewSwitch(from.url.pathname, to.url.pathname)) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		reveal();
	});
}

/**
 * The parts of a screen that step in one by one. A main stack or form steps in by its children;
 * a Reveal wrapper (display: contents, so it has no box to animate) by whatever it holds.
 */
function sectionsOf(element: Element): Element[] {
	if (element.classList.contains('reveal')) return [...element.children].flatMap(sectionsOf);
	if (element.matches('.stack, .form-stack, [data-view-content]'))
		return [...element.children].flatMap((child) =>
			child.classList.contains('reveal') ? [...child.children].flatMap(sectionsOf) : [child]
		);
	return [element];
}

const REVEAL_MS = 440;
const REVEAL_STEP = 45;
/** Sections after this many all come in together, so a long screen never makes you wait. */
const REVEAL_MAX_STEPS = 6;
const REVEAL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Fades the screen's sections up into place, one after another, top to bottom. Also used when
 * a screen that arrived as placeholders gets its content, so it cascades in the same way.
 * Sections are found by sectionsOf. Only sections you can see animate. Opacity and transform,
 * on the compositor.
 */
export function reveal(root: Element | null = document.querySelector('[data-page]')) {
	if (!root) return;
	const sections = [...root.children].flatMap(sectionsOf);
	let step = 0;
	for (const section of sections) {
		if (!(section instanceof HTMLElement)) continue;
		if (section.getBoundingClientRect().top > innerHeight) break;
		section.animate(
			[
				{ opacity: 0, transform: 'translateY(14px)' },
				{ opacity: 1, transform: 'none' }
			],
			{
				duration: REVEAL_MS,
				delay: Math.min(step, REVEAL_MAX_STEPS) * REVEAL_STEP,
				easing: REVEAL_EASE,
				fill: 'backwards'
			}
		);
		step += 1;
	}
}

/**
 * Loads every tab's code in a quiet moment after the app opens, so the first visit is quick.
 * preloadCode takes route IDs, not paths (a path is quietly skipped), so each tab's path is
 * matched to its route first.
 */
export function preloadTabs() {
	const load = () =>
		TABS.forEach((tab) =>
			match(tab.href)
				.then((route) => route && preloadCode(route.id))
				.catch(() => {})
		);
	const later = () => {
		if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 3000 });
		else setTimeout(load, 1500);
	};
	// Each tab's code brings its stylesheets, and adding them restyles the whole page. Under the
	// launch screen's fade (app.html) that flashed it, so wait until it has gone.
	if (document.getElementById('launch')) addEventListener('hb-launch-done', later, { once: true });
	else later();
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
