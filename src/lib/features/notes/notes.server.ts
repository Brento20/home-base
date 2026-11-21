import { error } from '@sveltejs/kit';
import { NOTES_KEY } from '$app/env/private';
import { dbError } from '#lib/server/db.js';
import { isSealed, seal, sealingKey, unseal } from '#lib/server/sealed.js';
import { getHouseholdId } from '#lib/features/household/household.server.js';
import { sampleNotes } from '#lib/server/sample-data.js';
import type { FieldErrors, HomeNote } from '#lib/types.js';

/**
 * Notes everyone in the home can read and edit. Row-level security keeps them to the home.
 * Secret notes are sealed before they reach the database when NOTES_KEY is set
 * (src/lib/server/sealed.ts); ones saved before the key existed are sealed the next time
 * they're read. Without the key (sample mode, a fresh clone) they're stored as typed.
 */

const NOTE_TITLE_MAX = 60;
const NOTE_BODY_MAX = 2000;

type NoteField = 'title' | 'body';

export interface NoteValues {
	title: string;
	body: string;
	isSecret: boolean;
}

interface NoteRow {
	id: string;
	title: string;
	body: string;
	is_secret: boolean;
	updated_at: string;
}

const key = () => sealingKey(NOTES_KEY);

/** What to save as the body: sealed for a secret note when there's a key, else as typed. */
async function bodyToSave(values: NoteValues, householdId: string) {
	const sealing = values.isSecret ? key() : null;
	return sealing ? seal(values.body, sealing, householdId) : values.body;
}

async function toNote(row: NoteRow, householdId: string): Promise<HomeNote> {
	const note: HomeNote = {
		id: row.id,
		title: row.title,
		body: row.body,
		isSecret: row.is_secret,
		updatedAt: row.updated_at
	};
	const { body, locked } = await readableBody(row.body, householdId);
	return locked ? { ...note, body, locked } : { ...note, body };
}

/**
 * A note's body as typed: opened with NOTES_KEY if it was sealed. `locked` when it was sealed
 * with a key this server doesn't have. Also used by house-sitter pages (sitter.server.ts).
 */
export async function readableBody(stored: string, householdId: string) {
	if (!isSealed(stored)) return { body: stored, locked: false };
	const sealing = key();
	const body = sealing ? await unseal(stored, sealing, householdId) : null;
	if (body === null) {
		console.error('[notes] a sealed note wouldn’t open: NOTES_KEY is missing or has changed.');
		return { body: '', locked: true };
	}
	return { body, locked: false };
}

/** Seals secret notes saved before NOTES_KEY was set. Best effort: the next read tries again. */
async function sealOldNotes(locals: App.Locals, rows: NoteRow[], householdId: string) {
	const sealing = key();
	const plain = rows.filter((row) => row.is_secret && row.body && !isSealed(row.body));
	if (!sealing || !locals.supabase || plain.length === 0) return;
	await Promise.all(
		plain.map(async (row) => {
			const { error: writeError } = await locals
				.supabase!.from('home_notes')
				.update({ body: await seal(row.body, sealing, householdId) })
				.eq('id', row.id)
				.eq('body', row.body); // only if no one has edited it meanwhile
			if (writeError) console.error('[notes] couldn’t seal an old secret note', writeError);
		})
	);
}

const COLUMNS = 'id, title, body, is_secret, updated_at';

export function parseNoteForm(form: FormData) {
	const values: NoteValues = {
		title: String(form.get('title') ?? '').trim(),
		body: String(form.get('body') ?? '').trim(),
		isSecret: form.get('isSecret') === 'on'
	};
	const errors: FieldErrors<NoteField> = {};
	if (!values.title) errors.title = 'Give the note a title.';
	else if (values.title.length > NOTE_TITLE_MAX)
		errors.title = `Keep it under ${NOTE_TITLE_MAX} characters.`;
	if (values.body.length > NOTE_BODY_MAX)
		errors.body = `Keep it under ${NOTE_BODY_MAX} characters.`;
	return { values, errors, valid: Object.keys(errors).length === 0 };
}

export async function listNotes(locals: App.Locals): Promise<HomeNote[]> {
	const { supabase } = locals;
	if (!supabase) return [...sampleNotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

	const householdId = await getHouseholdId(locals);
	const { data, error: readError } = await supabase
		.from('home_notes')
		.select(COLUMNS)
		.eq('household_id', householdId)
		.order('updated_at', { ascending: false });

	if (readError) dbError(readError);
	const rows = (data ?? []) as NoteRow[];
	await sealOldNotes(locals, rows, householdId);
	return Promise.all(rows.map((row) => toNote(row, householdId)));
}

export async function getNote(locals: App.Locals, id: string): Promise<HomeNote> {
	const { supabase } = locals;
	if (!supabase) {
		const note = sampleNotes.find((entry) => entry.id === id);
		if (!note) error(404, 'That note doesn’t exist any more.');
		return note;
	}

	const { data, error: readError } = await supabase
		.from('home_notes')
		.select(COLUMNS)
		.eq('id', id)
		.maybeSingle();

	if (readError) dbError(readError);
	if (!data) error(404, 'That note doesn’t exist any more.');
	const note = await toNote(data as NoteRow, await getHouseholdId(locals));
	// Editing a note that won't open would save over it with an empty body.
	if (note.locked)
		error(503, 'This secret note can’t be opened right now. Its key is missing or has changed.');
	return note;
}

export async function createNote(locals: App.Locals, values: NoteValues) {
	const { supabase } = locals;
	if (!supabase) {
		sampleNotes.push({ id: crypto.randomUUID(), ...values, updatedAt: new Date().toISOString() });
		return;
	}

	const householdId = await getHouseholdId(locals);
	const { error: writeError } = await supabase.from('home_notes').insert({
		household_id: householdId,
		title: values.title,
		body: await bodyToSave(values, householdId),
		is_secret: values.isSecret
	});
	if (writeError) dbError(writeError);
}

export async function updateNote(locals: App.Locals, id: string, values: NoteValues) {
	const { supabase } = locals;
	if (!supabase) {
		Object.assign(await getNote(locals, id), values, { updatedAt: new Date().toISOString() });
		return;
	}

	const { error: writeError } = await supabase
		.from('home_notes')
		.update({
			title: values.title,
			body: await bodyToSave(values, await getHouseholdId(locals)),
			is_secret: values.isSecret
		})
		.eq('id', id);
	if (writeError) dbError(writeError);
}

export async function deleteNote(locals: App.Locals, id: string) {
	const { supabase } = locals;
	if (!supabase) {
		const index = sampleNotes.findIndex((entry) => entry.id === id);
		if (index >= 0) sampleNotes.splice(index, 1);
		return;
	}

	const { error: writeError } = await supabase.from('home_notes').delete().eq('id', id);
	if (writeError) dbError(writeError);
}
