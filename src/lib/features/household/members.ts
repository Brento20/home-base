/**
 * A home's people as the database gives them, turned into what the app shows. No imports with
 * side effects (sample data makes ids as it loads, which Workers refuse outside a request), so
 * hooks.server.ts can use it for the lookup every request makes.
 */
import type { Household, Profile } from '#lib/types.js';

export interface ProfileRow {
	id: string;
	display_name: string;
	initials: string;
	accent_colour: string;
	avatar_path: string | null;
}

export interface MemberRow {
	role: 'owner' | 'member';
	joined_at?: string;
	profiles: ProfileRow | null;
}

/** The members part of a select, shared with the lookup every request makes (hooks.server.ts). */
export const MEMBER_COLUMNS =
	'role, joined_at, profiles ( id, display_name, initials, accent_colour, avatar_path )';

/**
 * Photos are served from this app (routes/avatars) so the URL stays the same between refreshes
 * and the browser can cache it. The file name changes with every upload, which busts the cache.
 */
export const avatarUrl = (profileId: string, path: string | null) =>
	path ? `/avatars/${profileId}?v=${encodeURIComponent(path.split('/').pop() ?? '')}` : null;

const toProfile = (row: ProfileRow): Profile => ({
	id: row.id,
	displayName: row.display_name,
	initials: row.initials,
	accentColour: row.accent_colour,
	avatarUrl: avatarUrl(row.id, row.avatar_path)
});

/**
 * A home and its people from rows as the database gives them, or null if you're not among them.
 * Members come you first, then everyone else in the order they joined.
 */
export function householdFrom(
	home: { id: string; name: string },
	rows: MemberRow[],
	userId: string
): { household: Household; me: Profile } | null {
	const ordered = [...rows].sort((a, b) => (a.joined_at ?? '').localeCompare(b.joined_at ?? ''));
	const members = ordered
		.map((row) => row.profiles)
		.filter((row): row is ProfileRow => row !== null)
		.map(toProfile)
		.sort((a, b) => (a.id === userId ? -1 : b.id === userId ? 1 : 0));
	const ownerIds = ordered
		.filter((row) => row.role === 'owner' && row.profiles)
		.map((row) => row.profiles!.id);
	const me = members.find((member) => member.id === userId);
	return me ? { household: { id: home.id, name: home.name, members, ownerIds }, me } : null;
}
