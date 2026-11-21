import { getHouseholdId } from '#lib/features/household/household.server.js';
import { readableBody } from '#lib/features/notes/notes.server.js';
import type { Repeat } from '#lib/features/tasks/repeat.js';
import { isLinkToken, sampleLinkToken } from '#lib/link-token.js';
import { dbError, friendlyMessage } from '#lib/server/db.js';
import { sampleHousehold, sampleNotes, sampleTasks } from '#lib/server/sample-data.js';
import { addDays, todayISO, zonedToInstant } from '#lib/time.js';
import type { SitterLink } from '#lib/types.js';
import { SITTER_LABEL_MAX, SITTER_MAX_DAYS, SITTER_MESSAGE_MAX } from './sitter.js';

/**
 * Making, listing and stopping house-sitter links, and the page a link opens (see sitter.ts).
 * The database builds that page in one function, sitter_view, from only what the link lists;
 * this side just opens any sealed secret notes with NOTES_KEY.
 */

export interface SitterPage {
	homeName: string;
	label: string;
	message: string;
	/** ISO instant: the link stops working then. */
	expiresAt: string;
	sharedBy: string;
	notes: { id: string; title: string; body: string; isSecret: boolean; locked: boolean }[];
	chores: { title: string; dueOn: string; repeat: Repeat; who: string | null }[];
}

export interface SitterValues {
	label: string;
	message: string;
	noteIds: string[];
	showChores: boolean;
	/** 'YYYY-MM-DD', the last day it works. */
	lastDay: string;
}

export function parseSitterForm(form: FormData, today = todayISO()) {
	const values: SitterValues = {
		label: String(form.get('label') ?? '').trim(),
		message: String(form.get('message') ?? '').trim(),
		noteIds: form.getAll('notes').map(String).filter(Boolean),
		showChores: form.get('chores') === 'on',
		lastDay: String(form.get('lastDay') ?? '')
	};
	let problem: string | null = null;
	if (values.label.length > SITTER_LABEL_MAX)
		problem = `Keep the name under ${SITTER_LABEL_MAX} characters.`;
	else if (values.message.length > SITTER_MESSAGE_MAX)
		problem = `Keep the message under ${SITTER_MESSAGE_MAX} characters.`;
	else if (
		!/^\d{4}-\d{2}-\d{2}$/.test(values.lastDay) ||
		values.lastDay < today ||
		values.lastDay > addDays(today, SITTER_MAX_DAYS)
	)
		problem = `Pick a last day between today and ${SITTER_MAX_DAYS} days away.`;
	else if (!values.message && values.noteIds.length === 0 && !values.showChores)
		problem = 'Add a message, pick a note or show the chores, so there’s something to see.';
	return { values, problem };
}

// Sample mode keeps links in memory, like the rest of its data.
const sampleLinks: (SitterLink & { token: string; noteIds: string[]; stopped: boolean })[] = [];
const isOpen = (link: { expiresAt: string; stopped?: boolean }) =>
	!link.stopped && Date.parse(link.expiresAt) > Date.now();

/** Links that still work, newest first. */
export async function listSitterLinks(locals: App.Locals): Promise<SitterLink[]> {
	if (!locals.supabase)
		return sampleLinks
			.filter(isOpen)
			.map(({ token: _token, noteIds: _notes, stopped: _stopped, ...link }) => link)
			.reverse();

	const { data, error } = await locals.supabase
		.from('sitter_links')
		.select('id, label, message, note_ids, show_chores, created_at, expires_at')
		.eq('household_id', await getHouseholdId(locals))
		.is('revoked_at', null)
		.gt('expires_at', new Date().toISOString())
		.order('created_at', { ascending: false });
	if (error) dbError(error);
	return (data ?? []).map((row) => ({
		id: row.id as string,
		label: row.label as string,
		message: row.message as string,
		noteCount: (row.note_ids as string[]).length,
		showChores: row.show_chores as boolean,
		createdAt: row.created_at as string,
		expiresAt: row.expires_at as string
	}));
}

export async function createSitterLink(
	locals: App.Locals,
	values: SitterValues
): Promise<{ token: string | null; message: string | null }> {
	if (!locals.supabase) {
		const token = sampleLinkToken();
		const noteIds = values.noteIds.filter((id) => sampleNotes.some((note) => note.id === id));
		sampleLinks.push({
			id: crypto.randomUUID(),
			token,
			label: values.label,
			message: values.message,
			noteIds,
			noteCount: noteIds.length,
			showChores: values.showChores,
			createdAt: new Date().toISOString(),
			expiresAt: zonedToInstant(addDays(values.lastDay, 1)).toISOString(),
			stopped: false
		});
		return { token, message: null };
	}
	const { data, error } = await locals.supabase.rpc('create_sitter_link', {
		who: values.label,
		note: values.message,
		notes: values.noteIds,
		chores: values.showChores,
		last_day: values.lastDay
	});
	if (error) return { token: null, message: friendlyMessage(error) };
	return { token: data as string, message: null };
}

export async function revokeSitterLink(locals: App.Locals, id: string) {
	if (!locals.supabase) {
		const link = sampleLinks.find((each) => each.id === id);
		if (link) link.stopped = true;
		return { message: null };
	}
	const { error } = await locals.supabase.rpc('revoke_sitter_link', { link: id });
	return { message: error ? friendlyMessage(error) : null };
}

interface ViewRow {
	household_id: string;
	home_name: string;
	label: string;
	message: string;
	expires_at: string;
	shared_by: string;
	notes: { id: string; title: string; body: string; is_secret: boolean }[];
	chores: { title: string; due_on: string; repeat: Repeat; who: string | null }[];
}

/** The page a link opens, or null when it's ended, been stopped, or never existed. */
export async function sitterPage(locals: App.Locals, token: string): Promise<SitterPage | null> {
	if (!isLinkToken(token)) return null;

	if (!locals.supabase) {
		const link = sampleLinks.find((each) => each.token === token);
		if (!link || !isOpen(link)) return null;
		const lastDay = addDays(todayISO(new Date(link.expiresAt)), -1);
		return {
			homeName: sampleHousehold.name,
			label: link.label,
			message: link.message,
			expiresAt: link.expiresAt,
			sharedBy: 'Brenton',
			notes: sampleNotes
				.filter((note) => link.noteIds.includes(note.id))
				.map(({ id, title, body, isSecret }) => ({ id, title, body, isSecret, locked: false })),
			chores: link.showChores
				? sampleTasks
						.filter((task) => !task.completedAt && !task.recipeId && task.dueOn)
						.filter((task) => task.dueOn! <= lastDay)
						.map((task) => ({
							title: task.title,
							dueOn: task.dueOn!,
							repeat: task.repeat,
							who:
								sampleHousehold.members.find((person) => person.id === task.assigneeId)
									?.displayName ?? null
						}))
				: []
		};
	}

	const { data, error } = await locals.supabase.rpc('sitter_view', { token });
	if (error) dbError(error);
	const row = data as ViewRow | null;
	if (!row) return null;
	return {
		homeName: row.home_name,
		label: row.label,
		message: row.message,
		expiresAt: row.expires_at,
		sharedBy: row.shared_by,
		notes: await Promise.all(
			row.notes.map(async (note) => ({
				id: note.id,
				title: note.title,
				isSecret: note.is_secret,
				...(await readableBody(note.body, row.household_id))
			}))
		),
		chores: row.chores.map((chore) => ({
			title: chore.title,
			dueOn: chore.due_on,
			repeat: chore.repeat,
			who: chore.who
		}))
	};
}
