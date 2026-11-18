import { error } from '@sveltejs/kit';
import { dbError } from '#lib/server/db.js';
import { getHouseholdId } from '#lib/features/household/household.server.js';
import { sampleLists, sampleProfiles } from '#lib/server/sample-data.js';
import type { FieldErrors, ListItem, ListSummary, ShoppingList } from '#lib/types.js';

/**
 * Named lists. A list finishes itself once every item is ticked (a database trigger sets
 * completed_at) and then shows under Past lists. Unticking or adding an item brings it back.
 */

const LIST_NAME_MAX = 60;
export const ITEM_NAME_MAX = 120;

interface ItemRow {
	id: string;
	name: string;
	checked: boolean;
	created_by: string | null;
}

interface ListRow {
	id: string;
	name: string;
	completed_at: string | null;
	list_items: { checked: boolean }[];
}

const toItem = (row: ItemRow): ListItem => ({
	id: row.id,
	name: row.name,
	checked: row.checked,
	createdBy: row.created_by
});

const summarise = (row: ListRow): ListSummary => ({
	id: row.id,
	name: row.name,
	completedAt: row.completed_at,
	total: row.list_items.length,
	remaining: row.list_items.filter((item) => !item.checked).length
});

/** Unchecked first, in the order they were added within each group. */
const sortItems = (items: ListItem[]) =>
	[...items].sort((a, b) => Number(a.checked) - Number(b.checked));

export function parseListName(form: FormData) {
	const name = String(form.get('name') ?? '').trim();
	const errors: FieldErrors<'name'> = {};
	if (!name) errors.name = 'Give the list a name.';
	else if (name.length > LIST_NAME_MAX) errors.name = `Keep it under ${LIST_NAME_MAX} characters.`;
	return { name, errors, valid: !errors.name };
}

// Sample mode keeps the same rule as the database trigger.
function refreshSampleCompletion(list: ShoppingList) {
	const done = list.items.length > 0 && list.items.every((item) => item.checked);
	list.completedAt = done ? (list.completedAt ?? new Date().toISOString()) : null;
}

function sampleList(id: string) {
	const list = sampleLists.find((entry) => entry.id === id);
	if (!list) error(404, 'That list doesn’t exist any more.');
	return list;
}

async function readSummaries(locals: App.Locals, completed: boolean): Promise<ListSummary[]> {
	const { supabase } = locals;
	if (!supabase) {
		return sampleLists
			.filter((list) => Boolean(list.completedAt) === completed)
			.map((list) => ({
				id: list.id,
				name: list.name,
				completedAt: list.completedAt,
				total: list.items.length,
				remaining: list.items.filter((item) => !item.checked).length
			}))
			.sort((a, b) => (completed ? b.completedAt!.localeCompare(a.completedAt!) : 0));
	}

	const householdId = await getHouseholdId(locals);
	let query = supabase
		.from('lists')
		.select('id, name, completed_at, list_items ( checked )')
		.eq('household_id', householdId);
	query = completed
		? query.not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(50)
		: query.is('completed_at', null).order('created_at');

	const { data, error: readError } = await query;
	if (readError) dbError(readError);
	return ((data ?? []) as ListRow[]).map(summarise);
}

export const listActiveLists = (locals: App.Locals) => readSummaries(locals, false);
export const listPastLists = (locals: App.Locals) => readSummaries(locals, true);

export async function getList(locals: App.Locals, id: string): Promise<ShoppingList> {
	const { supabase } = locals;
	if (!supabase) {
		const list = sampleList(id);
		return { ...list, items: sortItems(list.items) };
	}

	const { data: list, error: listError } = await supabase
		.from('lists')
		.select('id, name, completed_at')
		.eq('id', id)
		.maybeSingle();
	if (listError) dbError(listError);
	if (!list) error(404, 'That list doesn’t exist any more.');

	const { data: rows, error: itemsError } = await supabase
		.from('list_items')
		.select('id, name, checked, created_by')
		.eq('list_id', id)
		.order('checked')
		.order('created_at', { ascending: false });
	if (itemsError) dbError(itemsError);

	return {
		id: list.id,
		name: list.name,
		completedAt: list.completed_at,
		items: (rows ?? []).map(toItem)
	};
}

export async function createList(locals: App.Locals, name: string): Promise<string> {
	const { supabase } = locals;
	if (!supabase) {
		const id = crypto.randomUUID();
		sampleLists.push({ id, name, completedAt: null, items: [] });
		return id;
	}

	const householdId = await getHouseholdId(locals);
	const { data, error: insertError } = await supabase
		.from('lists')
		.insert({ household_id: householdId, name })
		.select('id')
		.single();
	if (insertError) dbError(insertError);
	return data.id;
}

export async function renameList(locals: App.Locals, id: string, name: string) {
	const { supabase } = locals;
	if (!supabase) {
		sampleList(id).name = name;
		return;
	}

	const { error: updateError } = await supabase.from('lists').update({ name }).eq('id', id);
	if (updateError) dbError(updateError);
}

export async function deleteList(locals: App.Locals, id: string) {
	const { supabase } = locals;
	if (!supabase) {
		const index = sampleLists.findIndex((entry) => entry.id === id);
		if (index >= 0) sampleLists.splice(index, 1);
		return;
	}

	const { error: deleteError } = await supabase.from('lists').delete().eq('id', id);
	if (deleteError) dbError(deleteError);
}

export async function addListItem(locals: App.Locals, listId: string, name: string) {
	const { supabase } = locals;
	if (!supabase) {
		const list = sampleList(listId);
		list.items.unshift({
			id: crypto.randomUUID(),
			name,
			checked: false,
			createdBy: sampleProfiles[0].id
		});
		refreshSampleCompletion(list);
		return;
	}

	const { error: insertError } = await supabase
		.from('list_items')
		.insert({ list_id: listId, name });
	if (insertError) dbError(insertError);
}

/**
 * Adds several items in the order given (a recipe's ingredients), so they read top to bottom
 * the same way. The list shows newest first, so each is stamped a moment after the next.
 */
export async function addListItems(locals: App.Locals, listId: string, names: string[]) {
	const { supabase } = locals;
	if (!supabase) {
		const list = sampleList(listId);
		list.items.unshift(
			...names.map((name) => ({
				id: crypto.randomUUID(),
				name,
				checked: false,
				createdBy: sampleProfiles[0].id
			}))
		);
		refreshSampleCompletion(list);
		return;
	}

	const start = Date.now();
	const { error: insertError } = await supabase.from('list_items').insert(
		names.map((name, index) => ({
			list_id: listId,
			name,
			created_at: new Date(start + (names.length - index)).toISOString()
		}))
	);
	if (insertError) dbError(insertError);
}

export async function setListItemChecked(locals: App.Locals, itemId: string, checked: boolean) {
	const { supabase } = locals;
	if (!supabase) {
		const list = sampleLists.find((entry) => entry.items.some((item) => item.id === itemId));
		const item = list?.items.find((entry) => entry.id === itemId);
		if (list && item) {
			item.checked = checked;
			refreshSampleCompletion(list);
		}
		return;
	}

	const { error: updateError } = await supabase
		.from('list_items')
		.update({ checked })
		.eq('id', itemId);
	if (updateError) dbError(updateError);
}

export async function deleteListItem(locals: App.Locals, itemId: string) {
	const { supabase } = locals;
	if (!supabase) {
		const list = sampleLists.find((entry) => entry.items.some((item) => item.id === itemId));
		if (list) {
			list.items = list.items.filter((item) => item.id !== itemId);
			refreshSampleCompletion(list);
		}
		return;
	}

	const { error: deleteError } = await supabase.from('list_items').delete().eq('id', itemId);
	if (deleteError) dbError(deleteError);
}
