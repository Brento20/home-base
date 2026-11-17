import type { IconName } from './Icon.svelte';

/** The five tabs, in tab bar order. Page transitions slide in the direction of this order. */
export const TABS: { href: string; label: string; icon: IconName }[] = [
	{ href: '/', label: 'Today', icon: 'today' },
	{ href: '/plans', label: 'Plans', icon: 'plans' },
	{ href: '/lists', label: 'Lists', icon: 'lists' },
	{ href: '/money', label: 'Money', icon: 'money' },
	{ href: '/home', label: 'Home', icon: 'home' }
];

/** Which tab a path belongs to, or -1 for pages outside the tab bar (sign up, setup). */
export function tabIndexFor(pathname: string) {
	return TABS.findIndex((tab) =>
		tab.href === '/'
			? pathname === '/'
			: pathname === tab.href || pathname.startsWith(`${tab.href}/`)
	);
}
