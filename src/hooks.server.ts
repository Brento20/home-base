import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { redirectFor, stageFor } from '#lib/features/account/stage.js';
import { createSupabaseServerClient, supabaseConfigured } from '#lib/server/supabase.js';

export const handle: Handle = async ({ event, resolve }) => {
	const { locals } = event;
	locals.sampleMode = !supabaseConfigured;
	locals.supabase = supabaseConfigured ? createSupabaseServerClient(event) : null;
	locals.user = null;
	locals.householdId = null;

	if (!locals.supabase) {
		// Sample data: everything is open, including the sign-up pages, so they can be designed.
		locals.stage = 'ready';
		locals.householdId = 'sample-household';
		return resolve(event);
	}

	// getUser() checks the session with Supabase Auth rather than trusting the cookie.
	const { data } = await locals.supabase.auth.getUser();
	locals.user = data.user;

	let onboarded = false;
	if (locals.user) {
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('onboarded_at, household_members ( household_id )')
			.eq('id', locals.user.id)
			.maybeSingle();

		onboarded = Boolean(profile?.onboarded_at);
		const memberships = (profile?.household_members ?? []) as { household_id: string }[];
		locals.householdId = memberships[0]?.household_id ?? null;
	}

	locals.stage = stageFor(locals.user !== null, onboarded, locals.householdId !== null);

	const target = redirectFor(locals.stage, event.route.id);
	if (target && target !== event.url.pathname) redirect(303, target);

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};
