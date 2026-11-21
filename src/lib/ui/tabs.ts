import type { IconName } from './Icon.svelte';

/** The five tabs, in tab bar order. Page transitions slide in the direction of this order. */
export const TABS: { href: string; label: string; icon: IconName }[] = [
	{ href: '/', label: 'Today', icon: 'today' },
	{ href: '/plans', label: 'Plans', icon: 'plans' },
	{ href: '/lists', label: 'Lists', icon: 'lists' },
	{ href: '/money', label: 'Money', icon: 'money' },
	{ href: '/home', label: 'Home', icon: 'home' }
];

/**
 * A tab's other views: pages at their own address that are the same screen switched to show
 * something else (Lists | Tasks). Moving between them is a switch, like Plans' List | Calendar:
 * the heading and switch stay put and only what's below them changes, with no page slide.
 * They count as the tab's own page for swiping between tabs too.
 */
const TAB_VIEWS: string[][] = [['/lists', '/lists/tasks']];

/** Are these two addresses views of one tab's screen? */
export const isViewSwitch = (from: string, to: string) =>
	from !== to && TAB_VIEWS.some((views) => views.includes(from) && views.includes(to));

/** Is this a view of a tab's own screen (its root, or another view of it)? */
export const isTabView = (pathname: string) =>
	TABS.some((tab) => tab.href === pathname) || TAB_VIEWS.some((views) => views.includes(pathname));

/** Pages that belong to a tab without living under its path: the feed and dinner are Today's. */
const ALSO_UNDER: Record<string, string[]> = { '/': ['/feed', '/dinner'] };

/** Which tab a path belongs to, or -1 for pages outside the tab bar (sign up, setup). */
export function tabIndexFor(pathname: string) {
	const under = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
	return TABS.findIndex((tab) =>
		tab.href === '/'
			? pathname === '/' || ALSO_UNDER['/'].some(under)
			: under(tab.href) || (ALSO_UNDER[tab.href] ?? []).some(under)
	);
}
