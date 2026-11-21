import { isCurrency, isTimeZone } from '#lib/home.js';
import { friendlyMessage } from '#lib/server/db.js';
import type { PostgrestError } from '@supabase/supabase-js';
import { sampleHousehold } from '#lib/server/sample-data.js';
import { sampleHome } from '#lib/server/sample-home.js';
import type { FieldErrors } from '#lib/types.js';

/**
 * Building and looking after a home. The checks that matter live in the database functions
 * (create_household and the update rules on households); this file shapes the forms and turns
 * their messages into something the page can show. Joining is by invite link (invites.server.ts).
 */

export const HOME_NAME_MIN = 3;
export const HOME_NAME_MAX = 30;

const messageFrom = (problem: PostgrestError) => friendlyMessage(problem);

export function parseHomeForm(form: FormData) {
	const name = String(form.get('name') ?? '').trim();
	const errors: FieldErrors<'name'> = {};
	if (name.length < HOME_NAME_MIN || name.length > HOME_NAME_MAX)
		errors.name = `Use ${HOME_NAME_MIN} to ${HOME_NAME_MAX} characters.`;
	return { name, errors, valid: Object.keys(errors).length === 0 };
}

export async function createHome(locals: App.Locals, name: string) {
	if (!locals.supabase) return { message: null };
	const { error: problem } = await locals.supabase.rpc('create_household', { home_name: name });
	return { message: problem ? messageFrom(problem) : null };
}

export async function renameHome(locals: App.Locals, householdId: string, name: string) {
	if (!locals.supabase) {
		sampleHousehold.name = name;
		return { message: null };
	}
	const { data, error: problem } = await locals.supabase
		.from('households')
		.update({ name })
		.eq('id', householdId)
		.select('id');
	if (problem) return { message: messageFrom(problem) };
	if (!data?.length) return { message: 'Only the home’s owner can rename it.' };
	return { message: null };
}

/**
 * Where the home is: its time zone and currency (src/lib/home.ts). Owners only, like renaming:
 * the database's update rule refuses anyone else, which shows here as no rows changed.
 */
export async function setHomePlace(
	locals: App.Locals,
	householdId: string,
	place: { timeZone: string; currency: string }
) {
	if (!isTimeZone(place.timeZone)) return { message: 'Pick a time zone from the list.' };
	if (!isCurrency(place.currency)) return { message: 'Pick a currency from the list.' };
	if (!locals.supabase) {
		Object.assign(sampleHome, place);
		return { message: null };
	}
	const { data, error: problem } = await locals.supabase
		.from('households')
		.update({ time_zone: place.timeZone, currency: place.currency })
		.eq('id', householdId)
		.select('id');
	if (problem) return { message: messageFrom(problem) };
	if (!data?.length) return { message: 'Only the home’s owner can change this.' };
	return { message: null };
}

/**
 * Leaves the home. The last person out deletes it and everything in it; if the last owner
 * leaves, the longest-standing member becomes owner (leave_household in the database).
 */
export async function leaveHome(locals: App.Locals) {
	if (!locals.supabase) return { message: 'The sample home can’t be left. It’s only a preview.' };
	const { error: problem } = await locals.supabase.rpc('leave_household');
	return { message: problem ? messageFrom(problem) : null };
}
