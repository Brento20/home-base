/**
 * Shop for dinners, on the server: the dinners planned for the next week (with their scaled
 * recipes), what the home keeps in the pantry, and what's already waiting on the Shopping
 * list; then adding the ticked things to Shopping and remembering the pantry. The merging
 * itself is dinner-shopping.ts, shared with the screen.
 */
import { getHouseholdId } from '#lib/features/household/household.server.js';
import {
	addListItems,
	ensureShoppingList,
	getList,
	listActiveLists
} from '#lib/features/lists/lists.server.js';
import { DINNER_COLUMNS, toCookDinner } from '#lib/features/tasks/tasks.server.js';
import { dbError } from '#lib/server/db.js';
import { samplePantry, sampleTasks } from '#lib/server/sample-data.js';
import { addDays } from '#lib/time.js';
import type { CookDinner } from '#lib/types.js';
import {
	listItemKey,
	mergeDinnerIngredients,
	needLine,
	type PlannedDinner
} from './dinner-shopping.js';

/** How far ahead "this week's dinners" looks, today included. */
export const DINNER_DAYS = 7;

const toPlanned = (task: CookDinner): PlannedDinner => ({
	id: task.id,
	title: task.recipe.title,
	dueOn: task.dueOn!,
	servings: task.servings ?? task.recipe.servings,
	ingredients: task.recipe.ingredients ?? []
});

/** Dinners not yet cooked, from today for DINNER_DAYS, soonest first. */
export async function listPlannedDinners(
	locals: App.Locals,
	today: string
): Promise<PlannedDinner[]> {
	const until = addDays(today, DINNER_DAYS);
	const { supabase } = locals;
	if (!supabase) {
		return (sampleTasks as CookDinner[])
			.filter(
				(task) =>
					task.recipe &&
					'ingredients' in task.recipe &&
					!task.completedAt &&
					task.dueOn &&
					task.dueOn >= today &&
					task.dueOn < until
			)
			.sort((a, b) => a.dueOn!.localeCompare(b.dueOn!))
			.map(toPlanned);
	}
	const householdId = await getHouseholdId(locals);
	const { data, error: readError } = await supabase
		.from('tasks')
		.select(DINNER_COLUMNS)
		.eq('household_id', householdId)
		.not('recipe_id', 'is', null)
		.is('completed_at', null)
		.gte('due_on', today)
		.lt('due_on', until)
		.order('due_on')
		.limit(30);
	if (readError) dbError(readError);
	return (data ?? []).flatMap((row) => {
		const task = toCookDinner(row);
		return task ? [toPlanned(task)] : [];
	});
}

/** How many dinners are planned for the week, for the "Shop for dinners" row on Lists. */
export async function countPlannedDinners(locals: App.Locals, today: string): Promise<number> {
	const { supabase } = locals;
	if (!supabase) return (await listPlannedDinners(locals, today)).length;
	const householdId = await getHouseholdId(locals);
	const { count, error: readError } = await supabase
		.from('tasks')
		.select('id', { count: 'exact', head: true })
		.eq('household_id', householdId)
		.not('recipe_id', 'is', null)
		.is('completed_at', null)
		.gte('due_on', today)
		.lt('due_on', addDays(today, DINNER_DAYS));
	if (readError) dbError(readError);
	return count ?? 0;
}

/** What the home always has, by ingredient key. */
export async function getPantry(locals: App.Locals): Promise<Set<string>> {
	const { supabase } = locals;
	if (!supabase) return new Set(samplePantry);
	const { data, error: readError } = await supabase.from('pantry_staples').select('key').limit(500);
	if (readError) dbError(readError);
	return new Set((data ?? []).map((row) => row.key));
}

/** The Shopping list's id (made if it's missing) and what's waiting on it, unticked, by key. */
export async function getShopping(locals: App.Locals) {
	let shopping = (await listActiveLists(locals)).find((list) => list.pinned);
	if (!shopping) {
		await ensureShoppingList(locals);
		shopping = (await listActiveLists(locals)).find((list) => list.pinned);
	}
	const list = await getList(locals, shopping!.id);
	const waiting = new Set(
		list.items.filter((item) => !item.checked).map((item) => listItemKey(item.name))
	);
	return { listId: list.id, name: list.name, waiting };
}

async function updatePantry(locals: App.Locals, add: string[], remove: string[]) {
	const { supabase } = locals;
	if (!supabase) {
		add.forEach((key) => samplePantry.add(key));
		remove.forEach((key) => samplePantry.delete(key));
		return;
	}
	const householdId = await getHouseholdId(locals);
	if (add.length) {
		const { error: insertError } = await supabase.from('pantry_staples').upsert(
			add.map((key) => ({ household_id: householdId, key })),
			{ onConflict: 'household_id,key', ignoreDuplicates: true }
		);
		if (insertError) dbError(insertError);
	}
	if (remove.length) {
		const { error: deleteError } = await supabase
			.from('pantry_staples')
			.delete()
			.eq('household_id', householdId)
			.in('key', remove);
		if (deleteError) dbError(deleteError);
	}
}

/**
 * Adds the ticked things for the chosen dinners to Shopping, worked out again here from the
 * dinners themselves. With `remember`, anything with an amount you unticked goes in the pantry,
 * and anything from the pantry you ticked comes out of it.
 */
export async function shopForDinners(
	locals: App.Locals,
	today: string,
	dinnerIds: string[],
	ticked: Set<string>,
	remember: boolean
) {
	const chosen = new Set(dinnerIds);
	const [dinners, pantry, shopping] = await Promise.all([
		listPlannedDinners(locals, today),
		getPantry(locals),
		getShopping(locals)
	]);
	const needs = mergeDinnerIngredients(
		dinners.filter((dinner) => chosen.has(dinner.id)),
		pantry,
		shopping.waiting
	);
	const adding = needs.filter((need) => ticked.has(need.key));
	if (adding.length) await addListItems(locals, shopping.listId, adding.map(needLine));
	if (remember) {
		const stocked = needs
			.filter((need) => !ticked.has(need.key) && need.amounts.length > 0 && !need.onList)
			.map((need) => need.key);
		const restocked = adding.filter((need) => pantry.has(need.key)).map((need) => need.key);
		await updatePantry(
			locals,
			stocked.filter((key) => !pantry.has(key)),
			restocked
		);
	}
	return { count: adding.length, listId: shopping.listId };
}
