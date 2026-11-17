import { error } from '@sveltejs/kit';
import type { PostgrestError } from '@supabase/supabase-js';
import { sampleHousehold } from '#lib/server/sample-data.js';
import type { FieldErrors } from '#lib/types.js';

/**
 * Building, joining and looking after a home. The checks that matter live in the database
 * functions (create_household, join_household, set_household_password); this file shapes the
 * forms and turns their messages into something the page can show.
 */

export const HOME_NAME_MIN = 3;
export const HOME_NAME_MAX = 30;
export const HOME_PASSWORD_MIN = 8;

const NO_MATCH = 'That name and password don’t match.';

type HomeField = 'name' | 'password';

/** Messages raised by our own functions are written for people; anything else isn't. */
function messageFrom(problem: PostgrestError) {
	if (problem.code === 'P0001') return problem.message;
	if (problem.code === '23505') return 'That name is taken. Try another.';
	console.error(problem);
	return 'Something went wrong. Try again.';
}

export function parseHomeForm(form: FormData, { checkStrength }: { checkStrength: boolean }) {
	const name = String(form.get('name') ?? '').trim();
	const password = String(form.get('password') ?? '');
	const errors: FieldErrors<HomeField> = {};

	if (name.length < HOME_NAME_MIN || name.length > HOME_NAME_MAX)
		errors.name = `Use ${HOME_NAME_MIN} to ${HOME_NAME_MAX} characters.`;
	if (!password) errors.password = 'Enter the home password.';
	else if (checkStrength && password.length < HOME_PASSWORD_MIN)
		errors.password = `Use at least ${HOME_PASSWORD_MIN} characters.`;

	return { name, password, errors, valid: Object.keys(errors).length === 0 };
}

export async function createHome(locals: App.Locals, name: string, password: string) {
	if (!locals.supabase) return { message: null };
	const { error: problem } = await locals.supabase.rpc('create_household', {
		home_name: name,
		home_password: password
	});
	return { message: problem ? messageFrom(problem) : null };
}

export async function joinHome(locals: App.Locals, name: string, password: string) {
	if (!locals.supabase) return { message: null };
	const { data, error: problem } = await locals.supabase.rpc('join_household', {
		home_name: name,
		home_password: password
	});
	if (problem) return { message: messageFrom(problem) };
	return { message: data ? null : NO_MATCH };
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

export async function setHomePassword(locals: App.Locals, householdId: string, password: string) {
	if (!locals.supabase) return { message: null };
	const { error: problem } = await locals.supabase.rpc('set_household_password', {
		target_household: householdId,
		new_password: password
	});
	return { message: problem ? messageFrom(problem) : null };
}

/** Whether the home has a password yet. A home without one can't be joined. */
export async function homeHasPassword(locals: App.Locals, householdId: string) {
	if (!locals.supabase) return true;
	const { data, error: problem } = await locals.supabase.rpc('household_has_password', {
		target_household: householdId
	});
	if (problem) error(500, problem.message);
	return Boolean(data);
}
