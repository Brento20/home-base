import { avatarUrl } from '#lib/features/household/household.server.js';
import { isLinkToken, sampleLinkToken } from '#lib/link-token.js';
import { dbError, friendlyMessage } from '#lib/server/db.js';
import { sampleBlocked, sampleFriends } from '#lib/server/sample-data.js';
import type { Blocked, Friend, FriendLink } from '#lib/types.js';
import { FRIEND_LINK_DAYS } from './friends.js';
import { forgetSamplePostcardsFrom, removePhotosFrom } from './postcards.server.js';

/**
 * Friends, friend links and blocks (see friends.ts). The database functions do all the checking:
 * a link works once, nobody can add someone who has blocked them (or whom they've blocked), and
 * friends only ever see each other through my_friends().
 */

export interface FriendLinkPreview {
	name: string;
	initials: string;
	colour: string;
	usable: boolean;
	isYou: boolean;
	alreadyFriends: boolean;
}

interface FriendRow {
	id: string;
	name: string;
	initials: string;
	colour: string;
	avatar_path: string | null;
	home_name: string | null;
	friends_since: string;
}

const toFriend = (row: FriendRow): Friend => ({
	id: row.id,
	name: row.name,
	initials: row.initials,
	colour: row.colour,
	avatarUrl: avatarUrl(row.id, row.avatar_path),
	homeName: row.home_name,
	friendsSince: new Date(row.friends_since).toISOString()
});

// Sample mode keeps links in memory, like the rest of its data.
const sampleLinks: (FriendLink & { token: string; done: boolean })[] = [];
const isOpen = (link: FriendLink & { done?: boolean }) =>
	!link.done && Date.parse(link.expiresAt) > Date.now();

/** Your friends, by name. */
export async function listFriends(locals: App.Locals): Promise<Friend[]> {
	if (!locals.supabase) return [...sampleFriends];
	const { data, error } = await locals.supabase.rpc('my_friends');
	if (error) dbError(error);
	return ((data ?? []) as FriendRow[]).map(toFriend);
}

/** One friend, or null if they're not (or no longer) your friend. */
export async function getFriend(locals: App.Locals, id: string): Promise<Friend | null> {
	return (await listFriends(locals)).find((friend) => friend.id === id) ?? null;
}

/** Links you've made that nobody has used yet, newest first. */
export async function listFriendLinks(locals: App.Locals): Promise<FriendLink[]> {
	if (!locals.supabase)
		return sampleLinks
			.filter(isOpen)
			.map(({ id, createdAt, expiresAt }) => ({ id, createdAt, expiresAt }))
			.reverse();

	const { data, error } = await locals.supabase
		.from('friend_links')
		.select('id, created_at, expires_at')
		.is('used_at', null)
		.is('revoked_at', null)
		.gt('expires_at', new Date().toISOString())
		.order('created_at', { ascending: false });
	if (error) dbError(error);
	return (data ?? []).map((row) => ({
		id: row.id as string,
		createdAt: row.created_at as string,
		expiresAt: row.expires_at as string
	}));
}

export async function createFriendLink(
	locals: App.Locals
): Promise<{ token: string | null; message: string | null }> {
	if (!locals.supabase) {
		const token = sampleLinkToken();
		sampleLinks.push({
			id: crypto.randomUUID(),
			token,
			createdAt: new Date().toISOString(),
			expiresAt: new Date(Date.now() + FRIEND_LINK_DAYS * 86_400_000).toISOString(),
			done: false
		});
		return { token, message: null };
	}
	const { data, error } = await locals.supabase.rpc('create_friend_link');
	if (error) return { token: null, message: friendlyMessage(error) };
	return { token: data as string, message: null };
}

export async function revokeFriendLink(locals: App.Locals, id: string) {
	if (!locals.supabase) {
		const link = sampleLinks.find((each) => each.id === id);
		if (link) link.done = true;
		return { message: null };
	}
	const { error } = await locals.supabase.rpc('revoke_friend_link', { link: id });
	return { message: error ? friendlyMessage(error) : null };
}

/** What a friend link shows before it's accepted. Null for a link that never existed. */
export async function previewFriendLink(
	locals: App.Locals,
	token: string
): Promise<FriendLinkPreview | null> {
	if (!isLinkToken(token)) return null;

	if (!locals.supabase) {
		const link = sampleLinks.find((each) => each.token === token);
		if (!link) return null;
		// Sample mode has one person, so every link is your own.
		return {
			name: 'Brenton',
			initials: 'B',
			colour: '#e58440',
			usable: isOpen(link),
			isYou: true,
			alreadyFriends: false
		};
	}

	const { data, error } = await locals.supabase.rpc('preview_friend_link', { token });
	if (error) dbError(error);
	const row = (
		data as {
			name: string;
			initials: string;
			colour: string;
			usable: boolean;
			is_you: boolean;
			already_friends: boolean;
		}[]
	)?.[0];
	return row
		? {
				name: row.name,
				initials: row.initials,
				colour: row.colour,
				usable: row.usable,
				isYou: row.is_you,
				alreadyFriends: row.already_friends
			}
		: null;
}

/** Becomes friends with whoever made the link. Returns their id. */
export async function acceptFriendLink(
	locals: App.Locals,
	token: string
): Promise<{ friendId: string | null; message: string | null }> {
	if (!locals.supabase) return { friendId: null, message: 'That’s your own link.' };
	const { data, error } = await locals.supabase.rpc('accept_friend_link', { token });
	if (error) return { friendId: null, message: friendlyMessage(error) };
	return { friendId: data as string, message: null };
}

export async function removeFriend(locals: App.Locals, id: string) {
	if (!locals.supabase) {
		const index = sampleFriends.findIndex((friend) => friend.id === id);
		if (index >= 0) sampleFriends.splice(index, 1);
		return { message: null };
	}
	const { error } = await locals.supabase.rpc('remove_friend', { other_profile: id });
	return { message: error ? friendlyMessage(error) : null };
}

/** Ends the friendship, takes their postcards off your feed and stops new ones. */
export async function blockPerson(locals: App.Locals, id: string, name: string) {
	if (!locals.supabase) {
		await removeFriend(locals, id);
		forgetSamplePostcardsFrom(id);
		if (!sampleBlocked.some((each) => each.id === id)) sampleBlocked.unshift({ id, name });
		return { message: null };
	}
	// Their photos go first: once their postcards are gone, nobody here may remove the files.
	await removePhotosFrom(locals, id);
	const { error } = await locals.supabase.rpc('block_person', { other_profile: id });
	return { message: error ? friendlyMessage(error) : null };
}

export async function unblockPerson(locals: App.Locals, id: string) {
	if (!locals.supabase) {
		const index = sampleBlocked.findIndex((each) => each.id === id);
		if (index >= 0) sampleBlocked.splice(index, 1);
		return { message: null };
	}
	const { error } = await locals.supabase.rpc('unblock_person', { other_profile: id });
	return { message: error ? friendlyMessage(error) : null };
}

export async function listBlocked(locals: App.Locals): Promise<Blocked[]> {
	if (!locals.supabase) return [...sampleBlocked];
	const { data, error } = await locals.supabase.rpc('my_blocks');
	if (error) dbError(error);
	return ((data ?? []) as { id: string; name: string }[]).map(({ id, name }) => ({ id, name }));
}
