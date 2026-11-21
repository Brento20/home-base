import type { Cookies } from '@sveltejs/kit';
import { sampleLinkToken } from '#lib/link-token.js';
import { dbError, friendlyMessage } from '#lib/server/db.js';
import { sampleHousehold } from '#lib/server/sample-data.js';
import { INVITE_DAYS, INVITE_USE_CHOICES, isInviteToken } from './invites.js';

/**
 * Making, listing, revoking and accepting invite links (see invites.ts). The database functions
 * do the checking: only owners make or revoke, a link stops working once it's used up, expired
 * or revoked, and accepting needs someone signed in, with a profile and no home yet.
 */

export interface Invite {
	id: string;
	createdAt: string;
	expiresAt: string;
	uses: number;
	maxUses: number;
}

export interface InvitePreview {
	homeName: string;
	invitedBy: string | null;
	usable: boolean;
}

/** Remembers the link while someone signs up, confirms their email and makes a profile. */
const COOKIE = 'hb_invite';

export function rememberInvite(cookies: Cookies, token: string) {
	cookies.set(COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * INVITE_DAYS
	});
}

export const forgetInvite = (cookies: Cookies) => cookies.delete(COOKIE, { path: '/' });

export function savedInvite(cookies: Cookies): string | null {
	const token = cookies.get(COOKIE);
	return token && isInviteToken(token) ? token : null;
}

// Sample mode keeps links in memory, like the rest of its data.
interface SampleInvite extends Invite {
	token: string;
	revoked: boolean;
}
const sampleInvites: SampleInvite[] = [];

const isLive = (invite: Invite & { revoked?: boolean }) =>
	!invite.revoked && invite.uses < invite.maxUses && Date.parse(invite.expiresAt) > Date.now();

/** Links that still work, newest first. Owners only (the database shows others none). */
export async function listInvites(locals: App.Locals, householdId: string): Promise<Invite[]> {
	if (!locals.supabase)
		return sampleInvites
			.filter(isLive)
			.map(({ id, createdAt, expiresAt, uses, maxUses }) => ({
				id,
				createdAt,
				expiresAt,
				uses,
				maxUses
			}))
			.reverse();

	const { data, error: problem } = await locals.supabase
		.from('household_invites')
		.select('id, created_at, expires_at, uses, max_uses')
		.eq('household_id', householdId)
		.is('revoked_at', null)
		.gt('expires_at', new Date().toISOString())
		.order('created_at', { ascending: false });
	if (problem) dbError(problem);
	return (data ?? [])
		.map((row) => ({
			id: row.id as string,
			createdAt: row.created_at as string,
			expiresAt: row.expires_at as string,
			uses: row.uses as number,
			maxUses: row.max_uses as number
		}))
		.filter(isLive);
}

export async function createInvite(
	locals: App.Locals,
	householdId: string,
	maxUses: number
): Promise<{ token: string | null; message: string | null }> {
	const useLimit = (INVITE_USE_CHOICES as readonly number[]).includes(maxUses) ? maxUses : 1;

	if (!locals.supabase) {
		const token = sampleLinkToken();
		sampleInvites.push({
			id: crypto.randomUUID(),
			token,
			createdAt: new Date().toISOString(),
			expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString(),
			uses: 0,
			maxUses: useLimit,
			revoked: false
		});
		return { token, message: null };
	}

	const { data, error: problem } = await locals.supabase.rpc('create_household_invite', {
		target_household: householdId,
		valid_days: INVITE_DAYS,
		use_limit: useLimit
	});
	if (problem) return { token: null, message: friendlyMessage(problem) };
	return { token: data as string, message: null };
}

export async function revokeInvite(locals: App.Locals, id: string) {
	if (!locals.supabase) {
		const invite = sampleInvites.find((each) => each.id === id);
		if (invite) invite.revoked = true;
		return { message: null };
	}
	const { error: problem } = await locals.supabase.rpc('revoke_household_invite', { invite: id });
	return { message: problem ? friendlyMessage(problem) : null };
}

/** What a link shows before it's accepted. Null for a link that never existed. */
export async function previewInvite(
	locals: App.Locals,
	token: string
): Promise<InvitePreview | null> {
	if (!isInviteToken(token)) return null;

	if (!locals.supabase) {
		const invite = sampleInvites.find((each) => each.token === token);
		if (!invite) return null;
		return { homeName: sampleHousehold.name, invitedBy: null, usable: isLive(invite) };
	}

	const { data, error: problem } = await locals.supabase.rpc('preview_household_invite', {
		token
	});
	if (problem) dbError(problem);
	const row = (data as { home_name: string; invited_by: string | null; usable: boolean }[])?.[0];
	return row ? { homeName: row.home_name, invitedBy: row.invited_by, usable: row.usable } : null;
}

export async function acceptInvite(locals: App.Locals, token: string) {
	// Sample mode is always signed in and already home, so there's nothing to join.
	if (!locals.supabase) return { message: null };
	const { error: problem } = await locals.supabase.rpc('accept_household_invite', { token });
	return { message: problem ? friendlyMessage(problem) : null };
}
