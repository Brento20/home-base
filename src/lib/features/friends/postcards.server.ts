import { error } from '@sveltejs/kit';
import { isReaction } from '#lib/features/feed/reactions.js';
import { getHouseholdId, myId } from '#lib/features/household/household.server.js';
import { dbError, friendlyMessage } from '#lib/server/db.js';
import {
	sampleAccount,
	sampleFriends,
	samplePostcards,
	sampleSentPostcards
} from '#lib/server/sample-data.js';
import { photoExtension, photoProblem, toBase64 } from '#lib/features/feed/photo-rules.js';
import type { FeedPost, FeedReaction, FieldErrors } from '#lib/types.js';
import { POSTCARD_MAX } from './friends.js';

/**
 * Postcards: a photo, a few lines or both, from friends, landing in your home's feed (see
 * friends.ts). Photos live in the private postcard-photos bucket under the sender's id.
 * send_postcard checks the sender and receiver are friends, in different homes, and not blocked;
 * row-level security shows a postcard only to the home it was sent to and to its sender, and
 * lets either remove it. Both can react and reply too; each reaction and reply carries its
 * giver's name, filled in by the database (20261125000200_postcard_conversations.sql).
 */

interface PostcardRow {
	id: string;
	photo_path: string | null;
	from_profile: string | null;
	to_profile: string | null;
	from_name: string;
	from_initials: string;
	from_colour: string;
	from_home: string;
	body: string;
	created_at: string;
	postcard_reactions: { profile_id: string; reaction: FeedReaction; name: string }[];
	postcard_replies: {
		id: string;
		author_id: string | null;
		author_name: string;
		author_initials: string;
		author_colour: string;
		body: string;
		created_at: string;
	}[];
}

const COLUMNS = `id, from_profile, to_profile, from_name, from_initials, from_colour, from_home, body,
	photo_path, created_at,
	postcard_reactions ( profile_id, reaction, name ),
	postcard_replies ( id, author_id, author_name, author_initials, author_colour, body, created_at )`;
const BUCKET = 'postcard-photos';

/** A postcard shaped like a feed post, so the feed can show both in one list. */
const toFeedPost = (row: PostcardRow): FeedPost => ({
	id: row.id,
	authorId: null,
	body: row.body,
	// Served from this app (routes/(app)/postcards/[id]/photo), read with the viewer's session.
	photoUrl: row.photo_path ? `/postcards/${row.id}/photo` : null,
	createdAt: new Date(row.created_at).toISOString(),
	reactions: row.postcard_reactions.map((entry) => ({
		profileId: entry.profile_id,
		reaction: entry.reaction,
		name: entry.name
	})),
	replies: [...row.postcard_replies]
		.sort((a, b) => a.created_at.localeCompare(b.created_at))
		.map((reply) => ({
			id: reply.id,
			authorId: reply.author_id,
			body: reply.body,
			createdAt: new Date(reply.created_at).toISOString(),
			author: {
				name: reply.author_name,
				initials: reply.author_initials,
				colour: reply.author_colour
			}
		})),
	plans: [],
	postcard: {
		profileId: row.from_profile,
		toProfileId: row.to_profile,
		name: row.from_name,
		initials: row.from_initials,
		colour: row.from_colour,
		home: row.from_home
	}
});

/** The newest `limit` postcards sent to your home (or the `limit` before `before`), plus one to tell if there are more. */
export async function listPostcards(
	locals: App.Locals,
	limit: number,
	before?: string
): Promise<FeedPost[]> {
	if (!locals.supabase)
		return samplePostcards
			.filter((card) => !before || card.createdAt < before)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
			.slice(0, limit + 1);

	let query = locals.supabase
		.from('postcards')
		.select(COLUMNS)
		.eq('to_household', await getHouseholdId(locals));
	if (before) query = query.lt('created_at', before);
	const { data, error: readError } = await query
		.order('created_at', { ascending: false })
		.limit(limit + 1);
	if (readError) dbError(readError);
	return ((data ?? []) as unknown as PostcardRow[]).map(toFeedPost);
}

const sampleCard = (id: string) =>
	[...samplePostcards, ...sampleSentPostcards].find((card) => card.id === id);

/** One postcard, for the home it went to or the person who sent it. */
export async function getPostcard(locals: App.Locals, id: string): Promise<FeedPost> {
	if (!locals.supabase) {
		const card = sampleCard(id);
		if (!card) error(404, 'That postcard has been taken down.');
		return card;
	}
	const { data, error: readError } = await locals.supabase
		.from('postcards')
		.select(COLUMNS)
		.eq('id', id)
		.maybeSingle();
	if (readError) dbError(readError);
	if (!data) error(404, 'That postcard has been taken down.');
	return toFeedPost(data as unknown as PostcardRow);
}

/** Every postcard between you and a friend, both ways, newest first. */
export async function listPostcardsBetween(
	locals: App.Locals,
	friendId: string,
	limit = 30
): Promise<FeedPost[]> {
	const me = myId(locals);
	if (!locals.supabase)
		return [...samplePostcards, ...sampleSentPostcards]
			.filter(
				(card) =>
					(card.postcard?.profileId === me && card.postcard.toProfileId === friendId) ||
					card.postcard?.profileId === friendId
			)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
			.slice(0, limit);

	const home = await getHouseholdId(locals);
	const { data, error: readError } = await locals.supabase
		.from('postcards')
		.select(COLUMNS)
		.or(
			`and(from_profile.eq.${me},to_profile.eq.${friendId}),and(from_profile.eq.${friendId},to_household.eq.${home})`
		)
		.order('created_at', { ascending: false })
		.limit(limit);
	if (readError) dbError(readError);
	return ((data ?? []) as unknown as PostcardRow[]).map(toFeedPost);
}

/** Your newest postcards, sent and received (by anyone in your home), for your profile. */
export async function listRecentPostcards(locals: App.Locals, limit = 6): Promise<FeedPost[]> {
	const me = myId(locals);
	if (!locals.supabase)
		return [...samplePostcards, ...sampleSentPostcards]
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
			.slice(0, limit);

	const home = await getHouseholdId(locals);
	const { data, error: readError } = await locals.supabase
		.from('postcards')
		.select(COLUMNS)
		.or(`from_profile.eq.${me},to_household.eq.${home}`)
		.order('created_at', { ascending: false })
		.limit(limit);
	if (readError) dbError(readError);
	return ((data ?? []) as unknown as PostcardRow[]).map(toFeedPost);
}

// Reacting and replying ---------------------------------------------------------------------

export const POSTCARD_REPLY_MAX = 1000;

/** Gives a reaction, swaps it for another, or takes it back if it's the one you gave. */
export async function togglePostcardReaction(locals: App.Locals, id: string, reaction: string) {
	if (!isReaction(reaction)) error(400, 'Unknown reaction.');
	const me = myId(locals);

	if (!locals.supabase) {
		const card = await getPostcard(locals, id);
		const mine = card.reactions.find((entry) => entry.profileId === me);
		card.reactions = card.reactions.filter((entry) => entry.profileId !== me);
		if (mine?.reaction !== reaction)
			card.reactions.push({ profileId: me, reaction, name: sampleAccount.nickname });
		return;
	}

	const { data: current, error: readError } = await locals.supabase
		.from('postcard_reactions')
		.select('reaction')
		.eq('postcard_id', id)
		.eq('profile_id', me)
		.maybeSingle();
	if (readError) dbError(readError);

	const { error: writeError } =
		current?.reaction === reaction
			? await locals.supabase
					.from('postcard_reactions')
					.delete()
					.eq('postcard_id', id)
					.eq('profile_id', me)
			: await locals.supabase
					.from('postcard_reactions')
					.upsert(
						{ postcard_id: id, profile_id: me, reaction },
						{ onConflict: 'postcard_id,profile_id' }
					);
	if (writeError) dbError(writeError);
}

export function parsePostcardReply(form: FormData) {
	const body = String(form.get('body') ?? '').trim();
	let problem: string | null = null;
	if (!body) problem = 'Write a reply first.';
	else if (body.length > POSTCARD_REPLY_MAX)
		problem = `Keep it under ${POSTCARD_REPLY_MAX} characters.`;
	return { body, problem };
}

export async function addPostcardReply(locals: App.Locals, id: string, body: string) {
	const me = myId(locals);
	if (!locals.supabase) {
		const card = await getPostcard(locals, id);
		card.replies.push({
			id: crypto.randomUUID(),
			authorId: me,
			body,
			createdAt: new Date().toISOString(),
			author: {
				name: sampleAccount.nickname,
				initials: sampleAccount.nickname.slice(0, 1),
				colour: sampleAccount.accentColour
			}
		});
		return;
	}
	const { error: insertError } = await locals.supabase
		.from('postcard_replies')
		.insert({ postcard_id: id, author_id: me, body });
	if (insertError) dbError(insertError);
}

export async function deletePostcardReply(locals: App.Locals, id: string, replyId: string) {
	const me = myId(locals);
	if (!locals.supabase) {
		const card = await getPostcard(locals, id);
		card.replies = card.replies.filter((reply) => reply.id !== replyId || reply.authorId !== me);
		return;
	}
	const { error: deleteError } = await locals.supabase
		.from('postcard_replies')
		.delete()
		.eq('id', replyId)
		.eq('author_id', me);
	if (deleteError) dbError(deleteError);
}

export type PostcardField = 'body' | 'photo';

export function parsePostcard(form: FormData) {
	const to = String(form.get('to') ?? '');
	const body = String(form.get('body') ?? '').trim();
	const upload = form.get('photo');
	const photo = upload instanceof File && upload.size > 0 ? upload : null;
	const errors: FieldErrors<PostcardField> = {};
	let message: string | null = null;

	if (body.length > POSTCARD_MAX) errors.body = `Keep it under ${POSTCARD_MAX} characters.`;
	const badPhoto = photoProblem(photo);
	if (badPhoto) errors.photo = badPhoto;
	if (!body && !photo) errors.body = 'Write something or add a photo.';
	if (!to) message = 'Pick who it’s for.';

	return { to, body, photo, errors, message, valid: !message && Object.keys(errors).length === 0 };
}

/**
 * Sends a postcard, with a photo if there is one. The photo goes into the sender's own folder
 * first (they can't write to the other home's), then send_postcard checks it and attaches it.
 */
export async function sendPostcard(
	locals: App.Locals,
	friendId: string,
	{ body, photo }: { body: string; photo: File | null }
) {
	if (!locals.supabase) {
		// Sample mode has no other homes: it's kept as sent, and shows on profiles.
		const friend = sampleFriends.find((each) => each.id === friendId);
		if (!friend) return { message: 'You can only send postcards to friends.' };
		const photoUrl = photo
			? `data:${photo.type};base64,${toBase64(new Uint8Array(await photo.arrayBuffer()))}`
			: null;
		sampleSentPostcards.push({
			id: crypto.randomUUID(),
			authorId: null,
			body,
			photoUrl,
			createdAt: new Date().toISOString(),
			reactions: [],
			replies: [],
			plans: [],
			postcard: {
				profileId: myId(locals),
				toProfileId: friendId,
				name: sampleAccount.nickname,
				initials: sampleAccount.nickname.slice(0, 1),
				colour: sampleAccount.accentColour,
				home: 'home base'
			}
		});
		return { message: null };
	}

	const supabase = locals.supabase;
	let photoPath: string | null = null;
	if (photo) {
		const path = `${locals.user?.id}/${crypto.randomUUID()}.${photoExtension(photo.type)}`;
		const { error: uploadError } = await supabase.storage
			.from(BUCKET)
			.upload(path, photo, { contentType: photo.type, upsert: false });
		if (uploadError) {
			console.error('[postcards] photo upload', uploadError);
			return { message: 'That photo didn’t upload. Try again.' };
		}
		photoPath = path;
	}

	const { error: sendError } = await supabase.rpc('send_postcard', {
		friend: friendId,
		message: body,
		photo: photoPath
	});
	if (sendError) {
		if (photoPath) await supabase.storage.from(BUCKET).remove([photoPath]);
		return { message: friendlyMessage(sendError) };
	}
	return { message: null };
}

/** A postcard's photo, read with the viewer's own session: only its home and its sender. */
export async function getPostcardPhoto(locals: App.Locals, id: string) {
	if (!locals.supabase) return null;
	const { data } = await locals.supabase
		.from('postcards')
		.select('photo_path')
		.eq('id', id)
		.maybeSingle();
	if (!data?.photo_path) return null;
	const { data: file } = await locals.supabase.storage.from(BUCKET).download(data.photo_path);
	return file ?? null;
}

/** Deletes the photos on postcards someone sent to your home (before blocking them). */
export async function removePhotosFrom(locals: App.Locals, profileId: string) {
	if (!locals.supabase) return;
	const { data } = await locals.supabase
		.from('postcards')
		.select('photo_path')
		.eq('from_profile', profileId)
		.eq('to_household', await getHouseholdId(locals))
		.not('photo_path', 'is', null);
	const paths = (data ?? []).map((row) => row.photo_path as string);
	if (paths.length) await locals.supabase.storage.from(BUCKET).remove(paths);
}

/** Takes a postcard down for everyone: from the home it went to, or by the person who sent it. */
export async function removePostcard(locals: App.Locals, id: string) {
	if (!locals.supabase) {
		for (const list of [samplePostcards, sampleSentPostcards]) {
			const index = list.findIndex((card) => card.id === id);
			if (index >= 0) list.splice(index, 1);
		}
		return { message: null };
	}
	// The photo first: who may remove it is worked out from the postcard, so it must still exist.
	const { data } = await locals.supabase
		.from('postcards')
		.select('photo_path')
		.eq('id', id)
		.maybeSingle();
	if (data?.photo_path) await locals.supabase.storage.from(BUCKET).remove([data.photo_path]);
	const { error: deleteError } = await locals.supabase.from('postcards').delete().eq('id', id);
	return { message: deleteError ? friendlyMessage(deleteError) : null };
}

/** In sample mode, blocking someone also takes their postcards down (the database does it live). */
export function forgetSamplePostcardsFrom(id: string) {
	for (let index = samplePostcards.length - 1; index >= 0; index--)
		if (samplePostcards[index].postcard?.profileId === id) samplePostcards.splice(index, 1);
}
