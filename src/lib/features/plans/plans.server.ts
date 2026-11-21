import { error } from '@sveltejs/kit';
import { dbError } from '#lib/server/db.js';
import { getHouseholdId, myId } from '#lib/features/household/household.server.js';
import {
	sampleFeedPosts,
	sampleGuestHomes,
	sampleImportedUids,
	samplePlans,
	sampleResponses
} from '#lib/server/sample-data.js';
import type { ImportedPlan } from './calendar-import.server.js';
import {
	addDays,
	isValidDateISO,
	isValidTime,
	todayISO,
	zonedParts,
	zonedToInstant
} from '#lib/time.js';
import type { FieldErrors, Plan, PlanResponse } from '#lib/types.js';

import {
	PLAN_LOCATION_MAX,
	PLAN_NOTES_MAX,
	PLAN_TITLE_MAX,
	type PlanField,
	type PlanFormValues,
	type PlanInput
} from './plan-input.js';

/**
 * Plans: the dated events on Today and the Plans tab. Times are stored as instants and shown
 * in the household's time zone; all-day plans start at local midnight.
 *
 * Plans another home invited yours to show up here too (plan-invites.server.ts). The lists
 * don't filter by home: row-level security returns exactly this home's plans and the ones it's
 * invited to.
 */

export type { PlanField, PlanFormValues, PlanInput };

interface PlanRow {
	id: string;
	household_id: string;
	title: string;
	notes: string;
	location: string;
	starts_at: string;
	ends_at: string | null;
	all_day: boolean;
	post_id: string | null;
	plan_invites: {
		household_id: string;
		guest_home: string;
		host_home: string;
		invited_by_name: string;
	}[];
	plan_responses: { profile_id: string; response: PlanResponse }[];
}

const COLUMNS = `id, household_id, title, notes, location, starts_at, ends_at, all_day, post_id,
	plan_invites ( household_id, guest_home, host_home, invited_by_name ),
	plan_responses ( profile_id, response )`;

/** Who you are and which home, to tell your plans from ones you're invited to. */
async function viewer(locals: App.Locals) {
	return { home: await getHouseholdId(locals), me: myId(locals) };
}

function toPlan(row: PlanRow, { home, me }: { home: string; me: string }): Plan {
	const plan: Plan = {
		id: row.id,
		title: row.title,
		notes: row.notes,
		location: row.location,
		startsAt: new Date(row.starts_at).toISOString(),
		endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
		allDay: row.all_day,
		postId: row.post_id
	};
	const invites = row.plan_invites ?? [];
	if (row.household_id !== home) {
		// Another home's plan: the only invite row you can see is your own home's.
		const yours = invites.find((invite) => invite.household_id === home);
		plan.invitedBy = { name: yours?.invited_by_name ?? 'Someone', home: yours?.host_home ?? '' };
	} else if (invites.length) {
		plan.guestHomes = invites.map((invite) => ({
			id: invite.household_id,
			name: invite.guest_home
		}));
	}
	if (plan.invitedBy || plan.guestHomes)
		plan.myResponse =
			(row.plan_responses ?? []).find((entry) => entry.profile_id === me)?.response ?? null;
	return plan;
}

/** Sample mode: your answer, and which homes were invited, from the sample's own lists. */
function withSampleGuests(plan: Plan, me: string): Plan {
	const homes = sampleGuestHomes[plan.id];
	if (!homes && !plan.invitedBy) return plan;
	return {
		...plan,
		...(plan.invitedBy ? {} : { guestHomes: (homes ?? []).map((name) => ({ id: name, name })) }),
		myResponse: sampleResponses.get(`${plan.id}:${me}`) ?? null
	};
}

/** A plan as editable form values, in household time. */
export function planToFormValues(plan: Plan): PlanFormValues {
	const start = zonedParts(new Date(plan.startsAt));
	return {
		title: plan.title,
		notes: plan.notes,
		location: plan.location,
		date: start.date,
		allDay: plan.allDay,
		startTime: plan.allDay ? '' : start.time,
		endTime: plan.endsAt && !plan.allDay ? zonedParts(new Date(plan.endsAt)).time : ''
	};
}

export function parsePlanForm(form: FormData) {
	const values: PlanFormValues = {
		title: String(form.get('title') ?? '').trim(),
		notes: String(form.get('notes') ?? '').trim(),
		location: String(form.get('location') ?? '').trim(),
		date: String(form.get('date') ?? ''),
		allDay: form.get('allDay') === 'on',
		startTime: String(form.get('startTime') ?? ''),
		endTime: String(form.get('endTime') ?? '')
	};
	const errors: FieldErrors<PlanField> = {};

	if (!values.title) errors.title = 'Give the plan a name.';
	else if (values.title.length > PLAN_TITLE_MAX)
		errors.title = `Keep it under ${PLAN_TITLE_MAX} characters.`;
	if (values.notes.length > PLAN_NOTES_MAX) errors.notes = 'Notes are too long.';
	if (values.location.length > PLAN_LOCATION_MAX) errors.location = 'That location is too long.';

	if (!values.date) errors.date = 'Pick a date.';
	else if (!isValidDateISO(values.date)) errors.date = 'That date doesn’t look right.';

	if (!values.allDay) {
		if (!values.startTime) errors.startTime = 'Add a start time, or make it all day.';
		else if (!isValidTime(values.startTime)) errors.startTime = 'That time doesn’t look right.';
		if (values.endTime && !isValidTime(values.endTime))
			errors.endTime = 'That time doesn’t look right.';
		else if (values.endTime && values.endTime === values.startTime)
			errors.endTime = 'End after it starts.';
	}

	const valid = Object.keys(errors).length === 0;
	const input: PlanInput | null = valid
		? {
				title: values.title,
				notes: values.notes,
				location: values.location,
				allDay: values.allDay,
				startsAt: zonedToInstant(
					values.date,
					values.allDay ? '00:00' : values.startTime
				).toISOString(),
				// An end time earlier than the start means it finishes after midnight.
				endsAt:
					!values.allDay && values.endTime
						? zonedToInstant(
								values.endTime < values.startTime ? addDays(values.date, 1) : values.date,
								values.endTime
							).toISOString()
						: null
			}
		: null;

	return { input, errors, values, valid };
}

/**
 * How many plans the Plans list draws at first: about two screens. More load as you scroll near
 * the end. A long list is slow to slide in and out of however little data it is (the browser
 * draws and photographs the whole page for the transition), so the list grows only as needed.
 */
export const PLANS_PAGE = 12;
export const PLANS_PAGE_MAX = 100;

/**
 * A page of the Plans list: `limit` plans from the start of today, after skipping `offset`,
 * and whether there are later ones still.
 */
export async function listUpcomingPlansPage(
	locals: App.Locals,
	offset = 0,
	limit = PLANS_PAGE
): Promise<{ plans: Plan[]; hasMore: boolean }> {
	const plans = await listUpcomingPlans(locals, limit + 1, offset);
	return { plans: plans.slice(0, limit), hasMore: plans.length > limit };
}

/** Everything from the start of today, soonest first. */
export async function listUpcomingPlans(
	locals: App.Locals,
	limit = 100,
	offset = 0
): Promise<Plan[]> {
	const startOfToday = zonedToInstant(todayISO()).toISOString();
	const { supabase } = locals;
	if (!supabase) {
		return samplePlans
			.filter((plan) => plan.startsAt >= startOfToday)
			.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
			.slice(offset, offset + limit)
			.map((plan) => withSampleGuests(plan, myId(locals)));
	}

	const you = await viewer(locals);
	// No home filter: row-level security gives this home's plans and the ones it's invited to.
	const { data, error: readError } = await supabase
		.from('plans')
		.select(COLUMNS)
		.gte('starts_at', startOfToday)
		.order('starts_at')
		.order('id') // a steady order for plans at the same time, so pages never overlap
		.range(offset, offset + limit - 1);

	if (readError) dbError(readError);
	return ((data ?? []) as unknown as PlanRow[]).map((row) => toPlan(row, you));
}

/**
 * Plans on any day from `fromISO` up to (not including) `untilISO`, household-local dates:
 * for the month view. A plan that started earlier but is still going counts too.
 */
export async function listPlansBetween(
	locals: App.Locals,
	fromISO: string,
	untilISO: string
): Promise<Plan[]> {
	const from = zonedToInstant(fromISO).toISOString();
	const until = zonedToInstant(untilISO).toISOString();
	const { supabase } = locals;
	if (!supabase) {
		return samplePlans
			.filter((plan) => plan.startsAt < until && (plan.endsAt ?? plan.startsAt) >= from)
			.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
			.map((plan) => withSampleGuests(plan, myId(locals)));
	}

	const you = await viewer(locals);
	// No home filter: row-level security gives this home's plans and the ones it's invited to.
	const { data, error: readError } = await supabase
		.from('plans')
		.select(COLUMNS)
		.lt('starts_at', until)
		.or(`starts_at.gte.${from},ends_at.gte.${from}`)
		.order('starts_at')
		.limit(500);

	if (readError) dbError(readError);
	return ((data ?? []) as unknown as PlanRow[]).map((row) => toPlan(row, you));
}

/**
 * What's still on, soonest first: an all-day plan counts for its whole day, a timed plan
 * until it ends (or 30 minutes after it starts when it has no end time).
 */
export function pickComingUp(plans: Plan[], count: number, now = new Date()): Plan[] {
	const today = todayISO(now);
	return plans
		.filter((plan) => {
			if (plan.allDay) return zonedParts(new Date(plan.startsAt)).date >= today;
			const finishes = plan.endsAt
				? new Date(plan.endsAt).getTime()
				: new Date(plan.startsAt).getTime() + 30 * 60_000;
			return finishes >= now.getTime();
		})
		.slice(0, count);
}

export async function getPlan(locals: App.Locals, id: string): Promise<Plan> {
	const { supabase } = locals;
	if (!supabase) {
		const plan = samplePlans.find((entry) => entry.id === id);
		if (!plan) error(404, 'That plan doesn’t exist any more.');
		return withSampleGuests(plan, myId(locals));
	}

	const you = await viewer(locals);
	const { data, error: readError } = await supabase
		.from('plans')
		.select(COLUMNS)
		.eq('id', id)
		.maybeSingle();
	if (readError) dbError(readError);
	if (!data) error(404, 'That plan doesn’t exist any more.');
	return toPlan(data as unknown as PlanRow, you);
}

const toRow = (input: PlanInput) => ({
	title: input.title,
	notes: input.notes,
	location: input.location,
	starts_at: input.startsAt,
	ends_at: input.endsAt,
	all_day: input.allDay
});

/**
 * Saves a new plan and returns its id. `postId` links it to the feed post it was made from, so
 * the post shows the plan and the plan links back to the conversation.
 */
export async function createPlan(
	locals: App.Locals,
	input: PlanInput,
	postId: string | null = null
): Promise<string> {
	const { supabase } = locals;
	if (!supabase) {
		const id = crypto.randomUUID();
		samplePlans.push({ id, ...input, postId });
		const post = postId ? sampleFeedPosts.find((entry) => entry.id === postId) : null;
		post?.plans.push({ id, title: input.title, startsAt: input.startsAt, allDay: input.allDay });
		return id;
	}

	const householdId = await getHouseholdId(locals);
	const { data, error: insertError } = await supabase
		.from('plans')
		.insert({ household_id: householdId, post_id: postId, ...toRow(input) })
		.select('id')
		.single();
	if (insertError) dbError(insertError);
	return data.id;
}

export async function updatePlan(locals: App.Locals, id: string, input: PlanInput) {
	const { supabase } = locals;
	if (!supabase) {
		const plan = samplePlans.find((entry) => entry.id === id);
		if (!plan) error(404, 'That plan doesn’t exist any more.');
		Object.assign(plan, input);
		for (const post of sampleFeedPosts) {
			const link = post.plans.find((entry) => entry.id === id);
			if (link)
				Object.assign(link, { title: input.title, startsAt: input.startsAt, allDay: input.allDay });
		}
		return;
	}

	const { data, error: updateError } = await supabase
		.from('plans')
		.update(toRow(input))
		.eq('id', id)
		.select('id');
	if (updateError) dbError(updateError);
	if (!data?.length) error(404, 'That plan doesn’t exist any more.');
}

export async function deletePlan(locals: App.Locals, id: string) {
	const { supabase } = locals;
	if (!supabase) {
		const index = samplePlans.findIndex((entry) => entry.id === id);
		if (index >= 0) samplePlans.splice(index, 1);
		for (const post of sampleFeedPosts) post.plans = post.plans.filter((entry) => entry.id !== id);
		return;
	}

	const { error: deleteError } = await supabase.from('plans').delete().eq('id', id);
	if (deleteError) dbError(deleteError);
}

/** Saves imported plans, skipping any already copied from the same calendar event. */
export async function importPlans(locals: App.Locals, plans: ImportedPlan[]) {
	const { supabase } = locals;
	if (!supabase) {
		let added = 0;
		for (const { sourceUid, ...plan } of plans) {
			if (sampleImportedUids.has(sourceUid)) continue;
			sampleImportedUids.add(sourceUid);
			samplePlans.push({ id: crypto.randomUUID(), ...plan });
			added += 1;
		}
		return { added, alreadyHere: plans.length - added };
	}

	if (plans.length === 0) return { added: 0, alreadyHere: 0 };
	const householdId = await getHouseholdId(locals);
	const { data, error: insertError } = await supabase
		.from('plans')
		.upsert(
			plans.map((plan) => ({
				household_id: householdId,
				source_uid: plan.sourceUid,
				...toRow(plan)
			})),
			{ onConflict: 'household_id,source_uid', ignoreDuplicates: true }
		)
		.select('id');
	if (insertError) dbError(insertError);
	const added = data?.length ?? 0;
	return { added, alreadyHere: plans.length - added };
}
