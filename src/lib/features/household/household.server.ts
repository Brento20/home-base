import { error } from '@sveltejs/kit';
import { sampleHousehold, sampleProfiles } from '#lib/server/sample-data.js';
import type { Household, Profile } from '#lib/types.js';

/**
 * The signed-in person's home and everyone in it. hooks.server.ts has already worked out
 * which home they belong to (locals.householdId); this loads its name, members and owners.
 */

interface ProfileRow {
	id: string;
	display_name: string;
	initials: string;
	accent_colour: string;
	avatar_path: string | null;
}

interface MemberRow {
	role: 'owner' | 'member';
	profiles: ProfileRow | null;
}

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

/** The signed-in person's home with everyone in it, or sample data. */
export async function getHousehold(
	locals: App.Locals
): Promise<{ household: Household; me: Profile }> {
	const { supabase, user, householdId } = locals;
	if (!supabase || !user) return { household: sampleHousehold, me: sampleProfiles[0] };
	if (!householdId) error(403, 'Build or join a home first.');

	const [{ data: home, error: homeError }, { data: rows, error: membersError }] = await Promise.all(
		[
			supabase.from('households').select('id, name').eq('id', householdId).single(),
			supabase
				.from('household_members')
				.select('role, profiles ( id, display_name, initials, accent_colour, avatar_path )')
				.eq('household_id', householdId)
				.order('joined_at')
		]
	);

	if (homeError) error(500, homeError.message);
	if (membersError) error(500, membersError.message);

	const memberRows = (rows ?? []) as unknown as MemberRow[];
	const members = memberRows
		.map((row) => row.profiles)
		.filter((row): row is ProfileRow => row !== null)
		.map(toProfile)
		// You first, then everyone else in the order they joined.
		.sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : 0));

	const ownerIds = memberRows
		.filter((row) => row.role === 'owner' && row.profiles)
		.map((row) => row.profiles!.id);

	const me = members.find((member) => member.id === user.id);
	if (!me) error(500, 'Profile missing for this account.');

	return { household: { id: home.id, name: home.name, members, ownerIds }, me };
}

export async function getHouseholdId(locals: App.Locals): Promise<string> {
	if (locals.householdId) return locals.householdId;
	error(403, 'Build or join a home first.');
}
