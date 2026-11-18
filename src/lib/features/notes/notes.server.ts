import { error } from '@sveltejs/kit';
import { dbError } from '#lib/server/db.js';
import { getHouseholdId } from '#lib/features/household/household.server.js';
import { sampleNotes } from '#lib/server/sample-data.js';
import type { FieldErrors, HomeNote } from '#lib/types.js';

/** Notes everyone in the home can read and edit. Row-level security keeps them to the home. */

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

const toNote = (row: NoteRow): HomeNote => ({
	id: row.id,
	title: row.title,
	body: row.body,
	isSecret: row.is_secret,
	updatedAt: row.updated_at
});

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

	const { data, error: readError } = await supabase
		.from('home_notes')
		.select(COLUMNS)
		.eq('household_id', await getHouseholdId(locals))
		.order('updated_at', { ascending: false });

	if (readError) dbError(readError);
	return (data ?? []).map(toNote);
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
	return toNote(data);
}

export async function createNote(locals: App.Locals, values: NoteValues) {
	const { supabase } = locals;
	if (!supabase) {
		sampleNotes.push({ id: crypto.randomUUID(), ...values, updatedAt: new Date().toISOString() });
		return;
	}

	const { error: writeError } = await supabase.from('home_notes').insert({
		household_id: await getHouseholdId(locals),
		title: values.title,
		body: values.body,
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
		.update({ title: values.title, body: values.body, is_secret: values.isSecret })
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
