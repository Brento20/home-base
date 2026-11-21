/**
 * Invite links: the only way into a home. An owner makes one in Home settings; it opens
 * /join/[token], which carries the person through signing up and their profile, then joins
 * them. The database keeps only a hash of each token (20261124000000_invite_links.sql).
 */
import { isLinkToken } from '#lib/link-token.js';

/** How long a new link lasts, and how many people it lets in, unless the owner picks otherwise. */
export const INVITE_DAYS = 7;
export const INVITE_USE_CHOICES = [1, 5] as const;

export const isInviteToken = isLinkToken;

/**
 * The token from whatever was pasted: a whole link (from any host, so a link copied from the
 * live site still works on a preview build), a path, or the bare token. Null if none.
 */
export function tokenFromInvite(pasted: string): string | null {
	const text = pasted.trim();
	if (isInviteToken(text)) return text;
	const match = /\/join\/([A-Za-z0-9_-]+)/.exec(text);
	return match && isInviteToken(match[1]) ? match[1] : null;
}

export const inviteLink = (origin: string, token: string) => `${origin}/join/${token}`;

/** "Works for 1 more person" / "Works for 3 more people". */
export function placesLeft(uses: number, maxUses: number) {
	const left = Math.max(0, maxUses - uses);
	return `Works for ${left} more ${left === 1 ? 'person' : 'people'}`;
}
