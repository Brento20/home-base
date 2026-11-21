import { error } from '@sveltejs/kit';
import { getHouseholdId } from '#lib/features/household/household.server.js';
import { dbError, friendlyMessage } from '#lib/server/db.js';
import { sampleFriends, samplePostcards } from '#lib/server/sample-data.js';
import { photoExtension, photoProblem } from '#lib/features/feed/photo-rules.js';
import type { FeedPost, FieldErrors } from '#lib/types.js';
import { POSTCARD_MAX } from './friends.js';

/**
 * Postcards: a photo, a few lines or both, from friends, landing in your home's feed (see
 * friends.ts). Photos live in the private postcard-photos bucket under the sender's id.
 * send_postcard checks the sender and receiver are friends, in different homes, and not blocked;
 * row-level security shows a postcard only to the home it was sent to and to its sender, and
 * lets either remove it.
 */

interface PostcardRow {
	id: string;
	photo_path: string | null;
	from_profile: string | null;
	from_name: string;
	from_initials: string;
	from_colour: string;
	from_home: string;
	body: string;
	created_at: string;
}

const COLUMNS =
	'id, from_profile, from_name, from_initials, from_colour, from_home, body, photo_path, created_at';
const BUCKET = 'postcard-photos';

/** A postcard shaped like a feed post, so the feed can show both in one list. */
const toFeedPost = (row: PostcardRow): FeedPost => ({
	id: row.id,
	authorId: null,
	body: row.body,
	// Served from this app (routes/(app)/postcards/[id]/photo), read with the viewer's session.
	photoUrl: row.photo_path ? `/postcards/${row.id}/photo` : null,
	createdAt: new Date(row.created_at).toISOString(),
	reactions: [],
	replies: [],
	plans: [],
	postcard: {
		profileId: row.from_profile,
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
	return ((data ?? []) as PostcardRow[]).map(toFeedPost);
}

export async function getPostcard(locals: App.Locals, id: string): Promise<FeedPost> {
	if (!locals.supabase) {
		const card = samplePostcards.find((each) => each.id === id);
		if (!card) error(404, 'That postcard has been taken down.');
		return card;
	}
	const { data, error: readError } = await locals.supabase
		.from('postcards')
		.select(COLUMNS)
		.eq('id', id)
		.eq('to_household', await getHouseholdId(locals))
		.maybeSingle();
	if (readError) dbError(readError);
	if (!data) error(404, 'That postcard has been taken down.');
	return toFeedPost(data as PostcardRow);
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
		// Sample mode has no other homes to send to; pretend it went.
		const known = sampleFriends.some((friend) => friend.id === friendId);
		return { message: known ? null : 'You can only send postcards to friends.' };
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

/** Takes a postcard off your home's feed, for everyone here. */
export async function removePostcard(locals: App.Locals, id: string) {
	if (!locals.supabase) {
		const index = samplePostcards.findIndex((card) => card.id === id);
		if (index >= 0) samplePostcards.splice(index, 1);
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
