import { error } from '@sveltejs/kit';
import { dbError } from '#lib/server/db.js';
import { sampleHousehold, sampleProfiles } from '#lib/server/sample-data.js';
import type { Household, Profile } from '#lib/types.js';
import { householdFrom, MEMBER_COLUMNS, type MemberRow } from './members.js';

export { avatarUrl, householdFrom, MEMBER_COLUMNS } from './members.js';

/**
 * The signed-in person's home and everyone in it. hooks.server.ts has already worked out
 * which home they belong to (locals.householdId); this loads its name, members and owners.
 */

/**
 * The signed-in person's home with everyone in it, or sample data. Pages usually get it for
 * free: hooks.server.ts reads it in the same trip as the profile (`locals.household`), so this
 * only asks the database when that's missing (form actions, which may change it).
 */
export async function getHousehold(
	locals: App.Locals
): Promise<{ household: Household; me: Profile }> {
	const { supabase, user, householdId } = locals;
	if (!supabase || !user) return { household: sampleHousehold, me: sampleProfiles[0] };
	if (!householdId) error(403, 'Build or join a home first.');
	if (locals.household) return locals.household;

	const [{ data: home, error: homeError }, { data: rows, error: membersError }] = await Promise.all(
		[
			supabase.from('households').select('id, name').eq('id', householdId).single(),
			supabase
				.from('household_members')
				.select(MEMBER_COLUMNS)
				.eq('household_id', householdId)
				.order('joined_at')
		]
	);

	if (homeError) dbError(homeError);
	if (membersError) dbError(membersError);

	const found = householdFrom(home, (rows ?? []) as unknown as MemberRow[], user.id);
	if (!found) error(500, 'Profile missing for this account.');
	return found;
}

/** Who's signed in (in sample mode, the first sample person). */
export const myId = (locals: App.Locals) => locals.user?.id ?? sampleProfiles[0].id;

export async function getHouseholdId(locals: App.Locals): Promise<string> {
	if (locals.householdId) return locals.householdId;
	error(403, 'Build or join a home first.');
}
