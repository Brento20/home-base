import { error } from '@sveltejs/kit';
import { getHouseholdId } from '#lib/features/household/household.server.js';
import { sampleFeedPosts, samplePlans, sampleProfiles } from '#lib/server/sample-data.js';
import type { FeedPost, FeedReaction, FieldErrors } from '#lib/types.js';
import { isReaction } from './reactions.js';

/**
 * The home feed: quick updates and photos everyone in the home sees on Today, with replies and
 * reactions. Row-level security keeps every post, reply, reaction and photo to the home, and
 * lets only the author delete what they wrote.
 */

export const POST_BODY_MAX = 1000;
export const REPLY_BODY_MAX = 1000;
const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** How many posts Today shows at first, and how many more each "load older" adds. */
export const FEED_FIRST_PAGE = 5;
export const FEED_PAGE = 10;
/** The most posts one page load will return, however far someone scrolls. */
const FEED_MAX = 200;

interface PostRow {
	id: string;
	author_id: string | null;
	body: string;
	photo_path: string | null;
	created_at: string;
	feed_replies: { id: string; author_id: string | null; body: string; created_at: string }[];
	feed_reactions: { profile_id: string; reaction: FeedReaction }[];
	plans: { id: string; title: string; starts_at: string; all_day: boolean }[];
}

const COLUMNS = `id, author_id, body, photo_path, created_at,
	feed_replies ( id, author_id, body, created_at ),
	feed_reactions ( profile_id, reaction ),
	plans ( id, title, starts_at, all_day )`;

/** Photos are served from this app (routes/(app)/feed/photos) and never change once posted. */
const photoUrl = (postId: string, path: string | null) => (path ? `/feed/photos/${postId}` : null);

const toPost = (row: PostRow): FeedPost => ({
	id: row.id,
	authorId: row.author_id,
	body: row.body,
	photoUrl: photoUrl(row.id, row.photo_path),
	createdAt: new Date(row.created_at).toISOString(),
	reactions: row.feed_reactions.map((r) => ({ profileId: r.profile_id, reaction: r.reaction })),
	replies: [...row.feed_replies]
		.sort((a, b) => a.created_at.localeCompare(b.created_at))
		.map((reply) => ({
			id: reply.id,
			authorId: reply.author_id,
			body: reply.body,
			createdAt: new Date(reply.created_at).toISOString()
		})),
	plans: row.plans.map((plan) => ({
		id: plan.id,
		title: plan.title,
		startsAt: new Date(plan.starts_at).toISOString(),
		allDay: plan.all_day
	}))
});

/** The signed-in person's id (sample mode: the first sample person). */
export const myId = (locals: App.Locals) => locals.user?.id ?? sampleProfiles[0].id;

/** How many posts to show, from the ?feed= count Today keeps as you scroll. */
export function feedLimit(requested: string | null) {
	const count = Number(requested);
	if (!Number.isInteger(count) || count < FEED_FIRST_PAGE) return FEED_FIRST_PAGE;
	return Math.min(count, FEED_MAX);
}

/** The newest `limit` posts, and whether there are older ones. */
export async function listFeed(
	locals: App.Locals,
	limit = FEED_FIRST_PAGE
): Promise<{ posts: FeedPost[]; hasMore: boolean }> {
	const { supabase } = locals;
	if (!supabase) {
		const sorted = [...sampleFeedPosts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		return { posts: sorted.slice(0, limit), hasMore: sorted.length > limit };
	}

	const { data, error: readError } = await supabase
		.from('feed_posts')
		.select(COLUMNS)
		.eq('household_id', await getHouseholdId(locals))
		.order('created_at', { ascending: false })
		.limit(limit + 1);

	if (readError) error(500, readError.message);
	const rows = (data ?? []) as unknown as PostRow[];
	return { posts: rows.slice(0, limit).map(toPost), hasMore: rows.length > limit };
}

export async function getPost(locals: App.Locals, id: string): Promise<FeedPost> {
	const { supabase } = locals;
	if (!supabase) {
		const post = sampleFeedPosts.find((entry) => entry.id === id);
		if (!post) error(404, 'That post has been deleted.');
		return post;
	}

	const { data, error: readError } = await supabase
		.from('feed_posts')
		.select(COLUMNS)
		.eq('id', id)
		.maybeSingle();

	if (readError) error(500, readError.message);
	if (!data) error(404, 'That post has been deleted.');
	return toPost(data as unknown as PostRow);
}

// Writing a post ------------------------------------------------------------------------------

export type PostField = 'body' | 'photo';

export function parsePostForm(form: FormData) {
	const body = String(form.get('body') ?? '').trim();
	const upload = form.get('photo');
	const photo = upload instanceof File && upload.size > 0 ? upload : null;
	const errors: FieldErrors<PostField> = {};

	if (body.length > POST_BODY_MAX) errors.body = `Keep it under ${POST_BODY_MAX} characters.`;
	if (photo && !PHOTO_TYPES.includes(photo.type)) errors.photo = 'That photo type isn’t supported.';
	else if (photo && photo.size > PHOTO_MAX_BYTES) errors.photo = 'That photo is too big.';
	if (!body && !photo) errors.body = 'Write something or add a photo.';

	return { body, photo, errors, valid: Object.keys(errors).length === 0 };
}

function toBase64(bytes: Uint8Array) {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

/** Posts a message and/or photo as the signed-in person, and returns the new post's id. */
export async function createPost(
	locals: App.Locals,
	{ body, photo }: { body: string; photo: File | null }
): Promise<string> {
	const id = crypto.randomUUID();
	const { supabase } = locals;
	if (!supabase) {
		const dataUrl = photo
			? `data:${photo.type};base64,${toBase64(new Uint8Array(await photo.arrayBuffer()))}`
			: null;
		sampleFeedPosts.push({
			id,
			authorId: myId(locals),
			body,
			photoUrl: dataUrl,
			createdAt: new Date().toISOString(),
			reactions: [],
			replies: [],
			plans: []
		});
		return id;
	}

	const householdId = await getHouseholdId(locals);
	let photoPath: string | null = null;
	if (photo) {
		const extension =
			photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
		const path = `${householdId}/${id}.${extension}`;
		const { error: uploadError } = await supabase.storage
			.from('feed-photos')
			.upload(path, photo, { contentType: photo.type, upsert: false });
		if (uploadError) error(500, 'That photo didn’t upload. Try again.');
		photoPath = path;
	}

	const { error: insertError } = await supabase
		.from('feed_posts')
		.insert({ id, household_id: householdId, body, photo_path: photoPath });

	if (insertError) {
		if (photoPath) await supabase.storage.from('feed-photos').remove([photoPath]);
		error(500, insertError.message);
	}
	return id;
}

/** Deletes a post the signed-in person wrote, with its replies, reactions and photo. */
export async function deletePost(locals: App.Locals, id: string) {
	const { supabase } = locals;
	if (!supabase) {
		const index = sampleFeedPosts.findIndex((entry) => entry.id === id);
		if (index < 0 || sampleFeedPosts[index].authorId !== myId(locals)) return;
		sampleFeedPosts.splice(index, 1);
		// As in the database: plans made from the post stay, without the link.
		for (const plan of samplePlans) if (plan.postId === id) plan.postId = null;
		return;
	}

	// Row-level security only lets authors delete, so nothing comes back for anyone else.
	const { data, error: deleteError } = await supabase
		.from('feed_posts')
		.delete()
		.eq('id', id)
		.select('photo_path');
	if (deleteError) error(500, deleteError.message);
	if (!data?.length) error(403, 'Only the person who posted it can delete it.');

	const path = data[0].photo_path as string | null;
	if (path) await supabase.storage.from('feed-photos').remove([path]);
}

/** The stored photo for a post, read with the signed-in person's own session. */
export async function getPostPhoto(locals: App.Locals, postId: string) {
	const { supabase } = locals;
	if (!supabase) return null;

	const { data: post } = await supabase
		.from('feed_posts')
		.select('photo_path')
		.eq('id', postId)
		.maybeSingle();
	if (!post?.photo_path) return null;

	const { data: file } = await supabase.storage.from('feed-photos').download(post.photo_path);
	return file ?? null;
}

// Replies -------------------------------------------------------------------------------------

export function parseReplyForm(form: FormData) {
	const body = String(form.get('body') ?? '').trim();
	let problem: string | null = null;
	if (!body) problem = 'Write a reply first.';
	else if (body.length > REPLY_BODY_MAX) problem = `Keep it under ${REPLY_BODY_MAX} characters.`;
	return { body, problem };
}

export async function addReply(locals: App.Locals, postId: string, body: string) {
	const { supabase } = locals;
	if (!supabase) {
		const post = await getPost(locals, postId);
		post.replies.push({
			id: crypto.randomUUID(),
			authorId: myId(locals),
			body,
			createdAt: new Date().toISOString()
		});
		return;
	}

	const { error: insertError } = await supabase
		.from('feed_replies')
		.insert({ post_id: postId, body });
	if (insertError) error(500, insertError.message);
}

export async function deleteReply(locals: App.Locals, postId: string, replyId: string) {
	const { supabase } = locals;
	if (!supabase) {
		const post = await getPost(locals, postId);
		const index = post.replies.findIndex(
			(reply) => reply.id === replyId && reply.authorId === myId(locals)
		);
		if (index >= 0) post.replies.splice(index, 1);
		return;
	}

	const { error: deleteError } = await supabase
		.from('feed_replies')
		.delete()
		.eq('id', replyId)
		.eq('post_id', postId);
	if (deleteError) error(500, deleteError.message);
}

// Reactions -----------------------------------------------------------------------------------

/**
 * Tapping a reaction sets it; tapping the one you already gave takes it back. Everyone has one
 * reaction per post, so picking another replaces yours.
 */
export async function toggleReaction(locals: App.Locals, postId: string, reaction: string) {
	if (!isReaction(reaction)) error(400, 'Unknown reaction.');
	const me = myId(locals);
	const { supabase } = locals;

	if (!supabase) {
		const post = await getPost(locals, postId);
		const mine = post.reactions.find((entry) => entry.profileId === me);
		post.reactions = post.reactions.filter((entry) => entry.profileId !== me);
		if (mine?.reaction !== reaction) post.reactions.push({ profileId: me, reaction });
		return;
	}

	const { data: current, error: readError } = await supabase
		.from('feed_reactions')
		.select('reaction')
		.eq('post_id', postId)
		.eq('profile_id', me)
		.maybeSingle();
	if (readError) error(500, readError.message);

	const { error: writeError } =
		current?.reaction === reaction
			? await supabase.from('feed_reactions').delete().eq('post_id', postId).eq('profile_id', me)
			: await supabase
					.from('feed_reactions')
					.upsert(
						{ post_id: postId, profile_id: me, reaction },
						{ onConflict: 'post_id,profile_id' }
					);
	if (writeError) error(500, writeError.message);
}
