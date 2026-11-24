import { avatarUrl, myId } from '#lib/features/household/household.server.js';
import { dbError } from '#lib/server/db.js';
import {
	sampleAccount,
	sampleFriendRequests,
	sampleFriends,
	sampleHousehold,
	samplePublicFields,
	sampleTerrace
} from '#lib/server/sample-data.js';
import type { PublicProfile } from '#lib/types.js';
import {
	BIO_MAX,
	emptyPublicFields,
	PUBLIC_FIELD_MAX,
	PUBLIC_FIELDS,
	type PublicFields
} from './public-profile.js';

/**
 * Reading anyone's public profile, and editing your own (see public-profile.ts). The database's
 * public_profile() decides what's shown: never someone either of you has blocked, and a photo
 * only for your home and your friends.
 */

interface ProfileRow {
	id: string;
	name: string;
	initials: string;
	colour: string;
	avatar_path: string | null;
	pronouns: string;
	bio: string;
	suburb: string;
	known_for: string;
	happy_to: string;
	local_spot: string;
	ask_me_about: string;
	home_name: string | null;
	is_you: boolean;
	is_friend: boolean;
	shares_home: boolean;
	request_sent: boolean;
	request_received: boolean;
}

const fieldsFrom = (row: Record<string, unknown>): PublicFields => {
	const fields = emptyPublicFields();
	for (const field of PUBLIC_FIELDS) fields[field.key] = String(row[field.column] ?? '');
	return fields;
};

/** Someone's public profile, or null if they don't exist (or one of you blocked the other). */
export async function getPublicProfile(
	locals: App.Locals,
	id: string
): Promise<PublicProfile | null> {
	if (!locals.supabase) return samplePublicProfile(id, myId(locals));
	const { data, error } = await locals.supabase.rpc('public_profile', { person: id });
	if (error) dbError(error);
	const row = (data as ProfileRow[] | null)?.[0];
	if (!row) return null;
	return {
		id: row.id,
		name: row.name,
		initials: row.initials,
		colour: row.colour,
		avatarUrl: avatarUrl(row.id, row.avatar_path),
		// Only yours and your housemates' come back (pronouns are private for now).
		pronouns: row.pronouns ?? '',
		bio: row.bio,
		homeName: row.home_name,
		fields: fieldsFrom(row as unknown as Record<string, unknown>),
		isYou: row.is_you,
		isFriend: row.is_friend,
		sharesHome: row.shares_home,
		requestSent: row.request_sent,
		requestReceived: row.request_received
	};
}

export interface PublicProfileValues {
	bio: string;
	fields: PublicFields;
}

export function parsePublicProfileForm(form: FormData) {
	const tidy = (name: string) =>
		String(form.get(name) ?? '')
			.replace(/\s+/g, ' ')
			.trim();
	const values: PublicProfileValues = { bio: tidy('bio'), fields: emptyPublicFields() };
	for (const field of PUBLIC_FIELDS) values.fields[field.key] = tidy(field.key);

	let problem: string | null = null;
	if (values.bio.length > BIO_MAX) problem = `Keep the line about you under ${BIO_MAX} characters.`;
	const long = PUBLIC_FIELDS.find((field) => values.fields[field.key].length > PUBLIC_FIELD_MAX);
	if (long) problem = `Keep “${long.label}” under ${PUBLIC_FIELD_MAX} characters.`;
	return { values, problem };
}

/** Your own answers, for the edit form. */
export async function getMyPublicProfile(locals: App.Locals): Promise<PublicProfileValues> {
	if (!locals.supabase || !locals.user)
		return {
			bio: sampleAccount.bio,
			fields: { ...(samplePublicFields[myId(locals)] ?? emptyPublicFields()) }
		};
	const { data, error } = await locals.supabase
		.from('profiles')
		.select(`bio, ${PUBLIC_FIELDS.map((field) => field.column).join(', ')}`)
		.eq('id', locals.user.id)
		.single();
	if (error) dbError(error);
	const row = data as unknown as Record<string, unknown>;
	return { bio: String(row.bio ?? ''), fields: fieldsFrom(row) };
}

export async function saveMyPublicProfile(locals: App.Locals, values: PublicProfileValues) {
	if (!locals.supabase || !locals.user) {
		sampleAccount.bio = values.bio;
		samplePublicFields[myId(locals)] = { ...values.fields };
		return;
	}
	const update: Record<string, string> = { bio: values.bio };
	for (const field of PUBLIC_FIELDS) update[field.column] = values.fields[field.key];
	const { error } = await locals.supabase.from('profiles').update(update).eq('id', locals.user.id);
	if (error) dbError(error);
}

// Sample mode: home base (Brenton, Chris) and The Terrace (Sam, Alex).

function samplePublicProfile(id: string, me: string): PublicProfile | null {
	const housemate = sampleHousehold.members.find((person) => person.id === id);
	const terrace = sampleTerrace.find((person) => person.id === id);
	if (!housemate && !terrace) return null;
	const friend = sampleFriends.find((each) => each.id === id);
	return {
		id,
		name: housemate?.displayName ?? terrace!.name,
		initials: housemate?.initials ?? terrace!.initials,
		colour: housemate?.accentColour ?? terrace!.colour,
		avatarUrl: housemate?.avatarUrl ?? null,
		pronouns: id === me ? sampleAccount.pronouns : '',
		bio: id === me ? sampleAccount.bio : (friend?.bio ?? ''),
		homeName: housemate ? sampleHousehold.name : 'The Terrace',
		fields: { ...(samplePublicFields[id] ?? emptyPublicFields()) },
		isYou: id === me,
		isFriend: Boolean(friend),
		sharesHome: Boolean(housemate),
		requestSent: sampleFriendRequests.some((request) => request.id === id && !request.incoming),
		requestReceived: sampleFriendRequests.some((request) => request.id === id && request.incoming)
	};
}
