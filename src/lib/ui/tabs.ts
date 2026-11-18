import type { IconName } from './Icon.svelte';

/** The five tabs, in tab bar order. Page transitions slide in the direction of this order. */
export const TABS: { href: string; label: string; icon: IconName }[] = [
	{ href: '/', label: 'Today', icon: 'today' },
	{ href: '/plans', label: 'Plans', icon: 'plans' },
	{ href: '/lists', label: 'Lists', icon: 'lists' },
	{ href: '/money', label: 'Money', icon: 'money' },
	{ href: '/home', label: 'Home', icon: 'home' }
];

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
