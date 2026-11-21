import { error } from '@sveltejs/kit';
import { avatarUrl, myId } from '#lib/features/household/household.server.js';
import { dbError, friendlyMessage } from '#lib/server/db.js';
import {
	sampleFriends,
	sampleGuestHomes,
	samplePlans,
	sampleProfiles,
	sampleResponses,
	sampleTerrace
} from '#lib/server/sample-data.js';
import type { PlanGuest, PlanResponse } from '#lib/types.js';

/**
 * Inviting friends' homes to a plan, answering, and who's coming (plan-guests.ts has the
 * wording). The database decides everything: only the plan's home invites, only friends can be
 * invited, each person answers only for themselves, and "add as friend" opens only once a plan
 * is over, between two people who both went (20261125000300_plan_invites.sql).
 */

interface GuestRow {
	profile_id: string;
	name: string;
	initials: string;
	colour: string;
	avatar_path: string | null;
	home_name: string;
	is_host_home: boolean;
	response: PlanResponse | null;
	is_you: boolean;
	can_add: boolean;
}

/** Everyone on a plan, the plan's home first, with their answers. Empty for a plan with no guests. */
export async function listGuests(locals: App.Locals, planId: string): Promise<PlanGuest[]> {
	if (!locals.supabase) return sampleGuests(planId, myId(locals));
	const { data, error: readError } = await locals.supabase.rpc('plan_guest_list', {
		target: planId
	});
	if (readError) dbError(readError);
	return ((data ?? []) as GuestRow[]).map((row) => ({
		id: row.profile_id,
		name: row.name,
		initials: row.initials,
		colour: row.colour,
		avatarUrl: avatarUrl(row.profile_id, row.avatar_path),
		home: row.home_name,
		isHostHome: row.is_host_home,
		response: row.response,
		isYou: row.is_you,
		canAdd: row.can_add
	}));
}

export async function inviteFriend(locals: App.Locals, planId: string, friendId: string) {
	if (!locals.supabase) {
		const friend = sampleFriends.find((each) => each.id === friendId);
		if (!friend?.homeName) return { message: 'You can only invite friends in a home.' };
		const homes = (sampleGuestHomes[planId] ??= []);
		if (!homes.includes(friend.homeName)) homes.push(friend.homeName);
		if (!sampleResponses.has(`${planId}:${myId(locals)}`))
			sampleResponses.set(`${planId}:${myId(locals)}`, 'going');
		return { message: null };
	}
	const { error: inviteError } = await locals.supabase.rpc('invite_to_plan', {
		target: planId,
		friend: friendId
	});
	return { message: inviteError ? friendlyMessage(inviteError) : null };
}

export async function uninviteHome(locals: App.Locals, planId: string, householdId: string) {
	if (!locals.supabase) {
		sampleGuestHomes[planId] = (sampleGuestHomes[planId] ?? []).filter(
			(name) => name !== householdId
		);
		return { message: null };
	}
	const { error: removeError } = await locals.supabase.rpc('uninvite_from_plan', {
		target: planId,
		guest_household: householdId
	});
	return { message: removeError ? friendlyMessage(removeError) : null };
}

/** Your answer. Tapping the answer you already gave takes it back. */
export async function respond(locals: App.Locals, planId: string, answer: string) {
	if (answer !== 'going' && answer !== 'not_going') error(400, 'Answer going or not going.');
	const key = `${planId}:${myId(locals)}`;

	if (!locals.supabase) {
		if (sampleResponses.get(key) === answer) sampleResponses.delete(key);
		else sampleResponses.set(key, answer);
		return;
	}
	const guests = await listGuests(locals, planId);
	const current = guests.find((guest) => guest.isYou)?.response ?? null;
	const { error: answerError } = await locals.supabase.rpc('respond_to_plan', {
		target: planId,
		answer: current === answer ? null : answer
	});
	if (answerError) dbError(answerError);
}

/** Friends with someone you went to the plan with, no link needed. */
export async function addFriendFromPlan(locals: App.Locals, planId: string, otherId: string) {
	if (!locals.supabase) {
		const other = sampleGuests(planId, myId(locals)).find(
			(guest) => guest.id === otherId && guest.canAdd
		);
		if (!other) return { message: 'You can add people who went too, once the plan’s over.' };
		sampleFriends.push({
			id: other.id,
			name: other.name,
			initials: other.initials,
			colour: other.colour,
			avatarUrl: null,
			bio: '',
			homeName: other.home,
			friendsSince: new Date().toISOString()
		});
		return { message: null };
	}
	const { error: addError } = await locals.supabase.rpc('add_friend_from_plan', {
		target: planId,
		other_profile: otherId
	});
	return { message: addError ? friendlyMessage(addError) : null };
}

// Sample mode: home base (Brenton and Chris) and The Terrace (Sam and Alex).

function sampleGuests(planId: string, me: string): PlanGuest[] {
	const plan = samplePlans.find((each) => each.id === planId);
	if (!plan) return [];
	const homeBase = sampleProfiles.map((person) => ({
		id: person.id,
		name: person.displayName,
		initials: person.initials,
		colour: person.accentColour,
		home: 'home base'
	}));
	const terrace = sampleTerrace.map((person) => ({ ...person, home: 'The Terrace' }));
	const invited = plan.invitedBy !== undefined && plan.invitedBy !== null;
	const homes = sampleGuestHomes[planId] ?? [];
	if (!invited && homes.length === 0) return [];

	const host = invited ? terrace : homeBase;
	const guests = invited ? homeBase : homes.includes('The Terrace') ? terrace : [];
	const over =
		new Date(plan.endsAt ?? plan.startsAt).getTime() + (plan.endsAt ? 0 : 3_600_000) < Date.now();
	const answer = (id: string) => sampleResponses.get(`${planId}:${id}`) ?? null;
	const myHome = homeBase.map((person) => person.id);

	return [
		...host.map((person) => ({ ...person, isHostHome: true })),
		...guests.map((person) => ({ ...person, isHostHome: false }))
	].map((person) => ({
		...person,
		avatarUrl: null,
		response: answer(person.id),
		isYou: person.id === me,
		canAdd:
			over &&
			answer(me) === 'going' &&
			answer(person.id) === 'going' &&
			!myHome.includes(person.id) &&
			!sampleFriends.some((friend) => friend.id === person.id)
	}));
}
