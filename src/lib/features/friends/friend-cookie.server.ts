import type { Cookies } from '@sveltejs/kit';
import { isLinkToken } from '#lib/link-token.js';
import { FRIEND_LINK_DAYS } from './friends.js';

/**
 * Remembers a friend link opened while signed out (or before finishing a profile), so it comes
 * back once you're in. On a phone, links from Messages open in the browser, which often isn't
 * signed in: without this you'd sign in, land on Today, and the friendship would never be made.
 * hooks.server.ts sends you back to /friend/[token] on the first page you open once you can
 * accept it.
 */
const COOKIE = 'hb_friend';

export function rememberFriendLink(cookies: Cookies, token: string) {
	cookies.set(COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * FRIEND_LINK_DAYS
	});
}

export const forgetFriendLink = (cookies: Cookies) => cookies.delete(COOKIE, { path: '/' });

export function savedFriendLink(cookies: Cookies): string | null {
	const token = cookies.get(COOKIE);
	return token && isLinkToken(token) ? token : null;
}
