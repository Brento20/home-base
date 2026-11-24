import { myId } from '#lib/features/household/household.server.js';
import { dbError, friendlyMessage } from '#lib/server/db.js';
import {
	sampleFriendCodes,
	sampleFriendRequests,
	sampleFriends,
	sampleTerrace
} from '#lib/server/sample-data.js';
import type { FriendRequest } from '#lib/types.js';

/**
 * Friend requests and friend codes: adding people without leaving the app. A request waits in the
 * other person's Requests until they accept or decline. Send one from a public profile, or by
 * typing someone's friend code (FIG-42Q), which they can swap for a new one at any time. Two people
 * asking each other become friends. The database enforces the limits: ten requests and twenty code
 * look-ups a day, nothing between blocked people, nothing between housemates
 * (20261126000000_friend_requests.sql).
 */

export type RequestResult = 'sent' | 'friends';

interface RequestRow {
	person: string;
	name: string;
	initials: string;
	colour: string;
	home_name: string | null;
	incoming: boolean;
	created_at: string;
}

/** Requests waiting on you, and ones you've sent, newest first. */
export async function listRequests(locals: App.Locals): Promise<FriendRequest[]> {
	if (!locals.supabase) return [...sampleFriendRequests];
	const { data, error } = await locals.supabase.rpc('my_friend_requests');
	if (error) dbError(error);
	return ((data ?? []) as RequestRow[]).map((row) => ({
		id: row.person,
		name: row.name,
		initials: row.initials,
		colour: row.colour,
		homeName: row.home_name,
		incoming: row.incoming,
		createdAt: new Date(row.created_at).toISOString()
	}));
}

/** How many requests are waiting on you: the dot on the Home tab. */
export async function countWaitingRequests(locals: App.Locals): Promise<number> {
	if (!locals.supabase) return sampleFriendRequests.filter((request) => request.incoming).length;
	if (!locals.user) return 0;
	const { count, error } = await locals.supabase
		.from('friend_requests')
		.select('*', { count: 'exact', head: true })
		.eq('to_profile', locals.user.id);
	if (error) return 0; // only a dot: never worth failing a page over
	return count ?? 0;
}

export async function sendRequest(
	locals: App.Locals,
	personId: string
): Promise<{ result: RequestResult | null; message: string | null }> {
	if (!locals.supabase) return { result: sampleSend(personId), message: null };
	const { data, error } = await locals.supabase.rpc('send_friend_request', { person: personId });
	if (error) return { result: null, message: friendlyMessage(error) };
	return { result: data as RequestResult, message: null };
}

/** A request to whoever has this code. */
export async function sendRequestByCode(
	locals: App.Locals,
	code: string
): Promise<{ result: RequestResult | null; name: string | null; message: string | null }> {
	const tidy = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
	if (tidy.length !== 6)
		return {
			result: null,
			name: null,
			message: 'A friend code is six letters and numbers, like FIG-42Q.'
		};
	const notFound = {
		result: null,
		name: null,
		message: 'No one has that code. Check it with them.'
	};

	if (!locals.supabase) {
		const formatted = `${tidy.slice(0, 3)}-${tidy.slice(3)}`;
		const id = Object.entries(sampleFriendCodes).find(([, value]) => value === formatted)?.[0];
		if (!id) return notFound;
		if (id === myId(locals)) return { result: null, name: null, message: 'That’s your own code.' };
		const name = sampleTerrace.find((person) => person.id === id)?.name ?? 'them';
		return { result: sampleSend(id), name, message: null };
	}

	const { data, error } = await locals.supabase.rpc('send_friend_request_by_code', { code });
	if (error) return { result: null, name: null, message: friendlyMessage(error) };
	const row = (data as { result: string; name: string | null }[])[0];
	if (row?.result === 'sent' || row?.result === 'friends')
		return { result: row.result, name: row.name, message: null };
	if (row?.result === 'bad_code')
		return {
			result: null,
			name: null,
			message: 'A friend code is six letters and numbers, like FIG-42Q.'
		};
	return notFound;
}

export async function answerRequest(locals: App.Locals, personId: string, accept: boolean) {
	if (!locals.supabase) {
		const index = sampleFriendRequests.findIndex(
			(request) => request.id === personId && request.incoming
		);
		if (index < 0) return { message: 'That request has gone.' };
		const [request] = sampleFriendRequests.splice(index, 1);
		if (accept) addSampleFriend(request.id);
		return { message: null };
	}
	const { error } = await locals.supabase.rpc('answer_friend_request', {
		person: personId,
		accept
	});
	return { message: error ? friendlyMessage(error) : null };
}

export async function cancelRequest(locals: App.Locals, personId: string) {
	if (!locals.supabase) {
		const index = sampleFriendRequests.findIndex(
			(request) => request.id === personId && !request.incoming
		);
		if (index >= 0) sampleFriendRequests.splice(index, 1);
		return { message: null };
	}
	const { error } = await locals.supabase.rpc('cancel_friend_request', { person: personId });
	return { message: error ? friendlyMessage(error) : null };
}

/** Your friend code, made the first time it's needed. */
export async function getFriendCode(locals: App.Locals): Promise<string> {
	if (!locals.supabase) return sampleFriendCodes[myId(locals)] ?? 'FIG-42Q';
	const { data, error } = await locals.supabase.rpc('my_friend_code');
	if (error) dbError(error);
	return data as string;
}

/** A new code: the old one stops working at once. */
export async function resetFriendCode(locals: App.Locals): Promise<string> {
	if (!locals.supabase) {
		const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
		const pick = () => letters[Math.floor(Math.random() * letters.length)];
		const code = `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`;
		sampleFriendCodes[myId(locals)] = code;
		return code;
	}
	const { data, error } = await locals.supabase.rpc('reset_friend_code');
	if (error) dbError(error);
	return data as string;
}

// Sample mode: requests to The Terrace's people.

function sampleSend(id: string): RequestResult {
	if (sampleFriends.some((friend) => friend.id === id)) return 'friends';
	const theirs = sampleFriendRequests.findIndex((request) => request.id === id && request.incoming);
	if (theirs >= 0) {
		sampleFriendRequests.splice(theirs, 1);
		addSampleFriend(id);
		return 'friends';
	}
	if (!sampleFriendRequests.some((request) => request.id === id)) {
		const person = sampleTerrace.find((each) => each.id === id);
		sampleFriendRequests.unshift({
			id,
			name: person?.name ?? 'Someone',
			initials: person?.initials ?? '?',
			colour: person?.colour ?? '#d6dce2',
			homeName: 'The Terrace',
			incoming: false,
			createdAt: new Date().toISOString()
		});
	}
	return 'sent';
}

function addSampleFriend(id: string) {
	const person = sampleTerrace.find((each) => each.id === id);
	if (!person || sampleFriends.some((friend) => friend.id === id)) return;
	sampleFriends.push({
		id,
		name: person.name,
		initials: person.initials,
		colour: person.colour,
		avatarUrl: null,
		bio: '',
		homeName: 'The Terrace',
		friendsSince: new Date().toISOString()
	});
}
