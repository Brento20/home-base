import { error } from '@sveltejs/kit';
import { getHouseholdId } from '#lib/features/household/household.server.js';
import { addListItems, createList } from '#lib/features/lists/lists.server.js';
import {
	completeTask,
	deleteTask,
	TASK_COLUMNS,
	toTask
} from '#lib/features/tasks/tasks.server.js';
import {
	sampleCheckins,
	sampleHomeRecipes,
	sampleProfiles,
	sampleRatings,
	sampleTasks
} from '#lib/server/sample-data.js';
import { addDays, isValidDateISO, isValidTime, todayISO, zonedToInstant } from '#lib/time.js';
import type { FieldErrors, Profile, Task } from '#lib/types.js';
import library from './library.json';
import {
	clampServings,
	cookTitle,
	parseIngredientLine,
	scaleIngredients,
	shoppingLine,
	summarise,
	type DinnerSnapshot,
	type Ingredient,
	type Nutrition,
	type Recipe
} from './recipe.js';

/**
 * Plan dinner. The library ships with the app; recipes a home adds live in public.recipes.
 * From any recipe you can make a shopping list and schedule who's cooking; ratings are one
 * per person per recipe. Sample mode keeps all of it in memory, the same way.
 */

const LIBRARY = (library as Omit<Recipe, 'custom'>[]).map((recipe) => ({
	...recipe,
	custom: false
})) as Recipe[];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const myId = (locals: App.Locals) => locals.user?.id ?? sampleProfiles[0].id;

// Recipes -------------------------------------------------------------------------------------

interface RecipeRow {
	id: string;
	title: string;
	base_servings: number;
	prep_minutes: number;
	cook_minutes: number;
	rest_minutes: number;
	cuisine: string | null;
	is_vegetarian: boolean;
	is_vegan: boolean;
	proteins: string[];
	ingredients: Ingredient[];
	steps: string[];
	nutrition: Nutrition | null;
	notes: string;
}

const RECIPE_COLUMNS =
	'id, title, base_servings, prep_minutes, cook_minutes, rest_minutes, cuisine, is_vegetarian, is_vegan, proteins, ingredients, steps, nutrition, notes';

const toRecipe = (row: RecipeRow): Recipe => ({
	id: row.id,
	title: row.title,
	baseServings: row.base_servings,
	prepMinutes: row.prep_minutes,
	cookMinutes: row.cook_minutes,
	restMinutes: row.rest_minutes,
	totalMinutes: row.prep_minutes + row.cook_minutes + row.rest_minutes,
	tags: [],
	cuisine: row.cuisine,
	isVegetarian: row.is_vegetarian,
	isVegan: row.is_vegan,
	proteins: row.proteins,
	ingredients: row.ingredients,
	steps: row.steps,
	nutrition: row.nutrition,
	nutritionNote: null,
	tips: row.notes ? [row.notes] : [],
	custom: true
});

const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title);

async function homeRecipes(locals: App.Locals): Promise<Recipe[]> {
	const { supabase } = locals;
	if (!supabase) return sampleHomeRecipes;

	const householdId = await getHouseholdId(locals);
	const { data, error: readError } = await supabase
		.from('recipes')
		.select(RECIPE_COLUMNS)
		.eq('household_id', householdId);
	if (readError) error(500, readError.message);
	return ((data ?? []) as RecipeRow[]).map(toRecipe);
}

/** Every recipe the home can cook, A to Z, as the library list shows them. */
export async function listRecipeSummaries(locals: App.Locals) {
	return [...LIBRARY, ...(await homeRecipes(locals))].sort(byTitle).map(summarise);
}

export async function getRecipe(locals: App.Locals, id: string): Promise<Recipe> {
	const builtIn = LIBRARY.find((recipe) => recipe.id === id);
	if (builtIn) return builtIn;

	const { supabase } = locals;
	if (!supabase) {
		const recipe = sampleHomeRecipes.find((entry) => entry.id === id);
		if (!recipe) error(404, 'That recipe isn’t in the library.');
		return recipe;
	}
	if (!UUID.test(id)) error(404, 'That recipe isn’t in the library.');

	const { data, error: readError } = await supabase
		.from('recipes')
		.select(RECIPE_COLUMNS)
		.eq('id', id)
		.maybeSingle();
	if (readError) error(500, readError.message);
	if (!data) error(404, 'That recipe isn’t in the library.');
	return toRecipe(data as RecipeRow);
}

export interface RecipeInput {
	title: string;
	baseServings: number;
	prepMinutes: number;
	cookMinutes: number;
	restMinutes: number;
	cuisine: string | null;
	isVegetarian: boolean;
	isVegan: boolean;
	proteins: string[];
	ingredients: Ingredient[];
	steps: string[];
	nutrition: Nutrition | null;
	notes: string;
}

type RecipeField = 'title' | 'baseServings' | 'minutes' | 'ingredients' | 'steps' | 'nutrition';

const minutes = (value: FormDataEntryValue | null) => {
	const number = Number(String(value ?? '').trim() || 0);
	return Number.isFinite(number) ? Math.round(number) : NaN;
};

const optionalNumber = (value: FormDataEntryValue | null) => {
	const text = String(value ?? '')
		.trim()
		.replace(',', '.');
	if (!text) return null;
	const number = Number(text);
	return Number.isFinite(number) && number >= 0 ? number : NaN;
};

/** Reads the add/edit recipe form: ingredients one per line, steps one per line. */
export function parseRecipeForm(form: FormData) {
	const values = {
		title: String(form.get('title') ?? '').trim(),
		baseServings: String(form.get('baseServings') ?? '2'),
		prepMinutes: String(form.get('prepMinutes') ?? ''),
		cookMinutes: String(form.get('cookMinutes') ?? ''),
		restMinutes: String(form.get('restMinutes') ?? ''),
		cuisine: String(form.get('cuisine') ?? '').trim(),
		isVegetarian: form.get('isVegetarian') === 'on' || form.get('isVegan') === 'on',
		isVegan: form.get('isVegan') === 'on',
		proteins: form.getAll('proteins').map(String).slice(0, 12),
		ingredients: String(form.get('ingredients') ?? ''),
		steps: String(form.get('steps') ?? ''),
		energyKj: String(form.get('energyKj') ?? ''),
		proteinG: String(form.get('proteinG') ?? ''),
		carbsG: String(form.get('carbsG') ?? ''),
		fatG: String(form.get('fatG') ?? ''),
		sugarsG: String(form.get('sugarsG') ?? ''),
		fibreG: String(form.get('fibreG') ?? ''),
		notes: String(form.get('notes') ?? '').trim()
	};
	const errors: FieldErrors<RecipeField> = {};

	if (!values.title) errors.title = 'Give it a name.';
	else if (values.title.length > 120) errors.title = 'Keep it under 120 characters.';

	const baseServings = Math.round(Number(values.baseServings));
	if (!(baseServings >= 1 && baseServings <= 12)) errors.baseServings = 'Between 1 and 12.';

	const [prep, cook, rest] = [values.prepMinutes, values.cookMinutes, values.restMinutes].map(
		minutes
	);
	if ([prep, cook, rest].some((value) => !(value >= 0 && value <= 1440)))
		errors.minutes = 'Minutes, as whole numbers.';

	const ingredients = values.ingredients
		.split('\n')
		.map(parseIngredientLine)
		.filter((ingredient): ingredient is Ingredient => ingredient !== null)
		.slice(0, 60);
	if (ingredients.length === 0) errors.ingredients = 'Add at least one ingredient.';

	const steps = values.steps
		.split('\n')
		.map((line) => line.trim().replace(/^\d+[.)]\s*/, ''))
		.filter(Boolean)
		.map((step) => step.slice(0, 1000))
		.slice(0, 40);
	if (steps.length === 0) errors.steps = 'Add at least one step.';

	const nutritionValues = [
		values.energyKj,
		values.proteinG,
		values.carbsG,
		values.fatG,
		values.sugarsG,
		values.fibreG
	].map(optionalNumber);
	let nutrition: Nutrition | null = null;
	if (nutritionValues.some((value) => Number.isNaN(value))) {
		errors.nutrition = 'Numbers only.';
	} else if (nutritionValues[0] !== null || nutritionValues[1] !== null) {
		if (nutritionValues[0] === null || nutritionValues[1] === null) {
			errors.nutrition = 'Energy and protein go together.';
		} else {
			const [energyKj, proteinG, carbsG, fatG, sugarsG, fibreG] = nutritionValues;
			nutrition = {
				energyKj: Math.round(energyKj!),
				proteinG: proteinG!,
				carbsG,
				fatG,
				sugarsG,
				fibreG
			};
		}
	}

	const input: RecipeInput = {
		title: values.title,
		baseServings,
		prepMinutes: prep,
		cookMinutes: cook,
		restMinutes: rest,
		cuisine: values.cuisine.slice(0, 60) || null,
		isVegetarian: values.isVegetarian,
		isVegan: values.isVegan,
		proteins: values.proteins,
		ingredients,
		steps,
		nutrition,
		notes: values.notes.slice(0, 1000)
	};
	return { input, errors, values, valid: Object.keys(errors).length === 0 };
}

const recipeRow = (input: RecipeInput) => ({
	title: input.title,
	base_servings: input.baseServings,
	prep_minutes: input.prepMinutes,
	cook_minutes: input.cookMinutes,
	rest_minutes: input.restMinutes,
	cuisine: input.cuisine,
	is_vegetarian: input.isVegetarian,
	is_vegan: input.isVegan,
	proteins: input.proteins,
	ingredients: input.ingredients,
	steps: input.steps,
	nutrition: input.nutrition,
	notes: input.notes
});

const sampleRecipe = (id: string, input: RecipeInput): Recipe => ({
	id,
	...input,
	totalMinutes: input.prepMinutes + input.cookMinutes + input.restMinutes,
	tags: [],
	nutritionNote: null,
	tips: input.notes ? [input.notes] : [],
	custom: true
});

export async function createRecipe(locals: App.Locals, input: RecipeInput): Promise<string> {
	const { supabase } = locals;
	if (!supabase) {
		const id = crypto.randomUUID();
		sampleHomeRecipes.push(sampleRecipe(id, input));
		return id;
	}

	const householdId = await getHouseholdId(locals);
	const { data, error: insertError } = await supabase
		.from('recipes')
		.insert({ household_id: householdId, ...recipeRow(input) })
		.select('id')
		.single();
	if (insertError) error(500, insertError.message);
	return data.id;
}

export async function updateRecipe(locals: App.Locals, id: string, input: RecipeInput) {
	const { supabase } = locals;
	if (!supabase) {
		const index = sampleHomeRecipes.findIndex((entry) => entry.id === id);
		if (index < 0) error(404, 'That recipe isn’t in the library.');
		sampleHomeRecipes[index] = sampleRecipe(id, input);
		return;
	}
	if (!UUID.test(id)) error(404, 'Only recipes added at home can be edited.');

	const { data, error: updateError } = await supabase
		.from('recipes')
		.update(recipeRow(input))
		.eq('id', id)
		.select('id');
	if (updateError) error(500, updateError.message);
	if (!data?.length) error(404, 'That recipe isn’t in the library.');
}

export async function deleteRecipe(locals: App.Locals, id: string) {
	const { supabase } = locals;
	if (!supabase) {
		const index = sampleHomeRecipes.findIndex((entry) => entry.id === id);
		if (index >= 0) sampleHomeRecipes.splice(index, 1);
		for (let i = sampleRatings.length - 1; i >= 0; i--)
			if (sampleRatings[i].recipeId === id) sampleRatings.splice(i, 1);
		return;
	}
	if (!UUID.test(id)) error(404, 'Only recipes added at home can be deleted.');

	const { error: deleteError } = await supabase.from('recipes').delete().eq('id', id);
	if (deleteError) error(500, deleteError.message);
}

// Ratings -------------------------------------------------------------------------------------

export interface Rating {
	profileId: string;
	stars: number;
}

/** Your stars for every recipe you've rated, by recipe id. */
export async function getMyStars(locals: App.Locals): Promise<Record<string, number>> {
	const me = myId(locals);
	const { supabase } = locals;
	if (!supabase) {
		return Object.fromEntries(
			sampleRatings.filter((rating) => rating.profileId === me).map((r) => [r.recipeId, r.stars])
		);
	}

	const householdId = await getHouseholdId(locals);
	const { data, error: readError } = await supabase
		.from('recipe_ratings')
		.select('recipe_id, stars')
		.eq('household_id', householdId)
		.eq('profile_id', me);
	if (readError) error(500, readError.message);
	return Object.fromEntries((data ?? []).map((row) => [row.recipe_id, row.stars]));
}

/** Everyone's stars for one recipe. */
export async function getRecipeRatings(locals: App.Locals, recipeId: string): Promise<Rating[]> {
	const { supabase } = locals;
	if (!supabase) {
		return sampleRatings
			.filter((rating) => rating.recipeId === recipeId)
			.map(({ profileId, stars }) => ({ profileId, stars }));
	}

	const householdId = await getHouseholdId(locals);
	const { data, error: readError } = await supabase
		.from('recipe_ratings')
		.select('profile_id, stars')
		.eq('household_id', householdId)
		.eq('recipe_id', recipeId);
	if (readError) error(500, readError.message);
	return (data ?? []).map((row) => ({ profileId: row.profile_id, stars: row.stars }));
}

export function parseStars(form: FormData) {
	const stars = Number(form.get('stars'));
	return Number.isInteger(stars) && stars >= 1 && stars <= 5 ? stars : null;
}

/**
 * Sets your rating for a recipe (replacing any earlier one). Rating it counts as answering
 * "How was it?" for its recent dinners, wherever you rated it from.
 */
export async function rateRecipe(
	locals: App.Locals,
	recipeId: string,
	stars: number,
	taskId: string | null = null
) {
	await getRecipe(locals, recipeId);
	const me = myId(locals);
	const { supabase } = locals;
	if (!supabase) {
		const existing = sampleRatings.find((r) => r.recipeId === recipeId && r.profileId === me);
		if (existing) existing.stars = stars;
		else sampleRatings.push({ recipeId, profileId: me, stars });
		await checkInRecipe(locals, recipeId, taskId);
		return;
	}

	const householdId = await getHouseholdId(locals);
	const { error: upsertError } = await supabase
		.from('recipe_ratings')
		.upsert(
			{ household_id: householdId, recipe_id: recipeId, profile_id: me, stars },
			{ onConflict: 'household_id,recipe_id,profile_id' }
		);
	if (upsertError) error(500, upsertError.message);
	await checkInRecipe(locals, recipeId, taskId);
}

/**
 * Records that you've answered (or waved off) "How was it?" for a dinner, and for any other
 * cooked dinner of the same recipe still waiting, so the same dish isn't asked about twice.
 */
export async function checkIn(locals: App.Locals, taskId: string) {
	const task = await getDinner(locals, taskId);
	await checkInRecipe(locals, task.recipeId!, taskId);
}

/** Marks every recent cooked dinner of a recipe as answered by you (rating it does this too). */
async function checkInRecipe(
	locals: App.Locals,
	recipeId: string,
	alsoTaskId: string | null = null
) {
	const me = myId(locals);
	const since = addDays(todayISO(), -LOOKBACK_DAYS);
	const { supabase } = locals;
	if (!supabase) {
		for (const dinner of sampleTasks) {
			if (
				dinner.recipeId === recipeId &&
				dinner.completedAt &&
				dinner.dueOn &&
				dinner.dueOn >= since
			)
				sampleCheckins.add(`${dinner.id}:${me}`);
		}
		if (alsoTaskId) sampleCheckins.add(`${alsoTaskId}:${me}`);
		return;
	}

	const { data, error: readError } = await supabase
		.from('tasks')
		.select('id')
		.eq('household_id', await getHouseholdId(locals))
		.eq('recipe_id', recipeId)
		.not('completed_at', 'is', null)
		.gte('due_on', since);
	if (readError) error(500, readError.message);
	const ids = new Set([...(alsoTaskId ? [alsoTaskId] : []), ...(data ?? []).map((row) => row.id)]);
	if (!ids.size) return;
	const { error: insertError } = await supabase.from('dinner_checkins').upsert(
		[...ids].map((id) => ({ task_id: id, profile_id: me })),
		{ onConflict: 'task_id,profile_id', ignoreDuplicates: true }
	);
	if (insertError) error(500, insertError.message);
}

// Shopping lists ------------------------------------------------------------------------------

/** Reads which ingredients to buy (their positions in the recipe) and the servings. */
export function parseShoppingForm(form: FormData, recipe: Recipe) {
	const servings = clampServings(Number(form.get('servings')));
	const picked = new Set(
		form
			.getAll('ingredient')
			.map(Number)
			.filter((index) => Number.isInteger(index) && index >= 0 && index < recipe.ingredients.length)
	);
	return { servings, picked: [...picked].sort((a, b) => a - b) };
}

/** A new list named after the meal, with the picked ingredients scaled to the servings. */
export async function createShoppingList(
	locals: App.Locals,
	recipe: Recipe,
	servings: number,
	picked: number[]
) {
	const scaled = scaleIngredients(recipe, servings);
	const names = picked.map((index) => shoppingLine(scaled[index]));
	const listId = await createList(locals, recipe.title.slice(0, 60));
	if (names.length) await addListItems(locals, listId, names);
	return { listId, count: names.length };
}

// Dinners -------------------------------------------------------------------------------------

export interface ScheduleInput {
	dueOn: string;
	dueTime: string | null;
	assigneeId: string | null;
}

type ScheduleField = 'dueOn' | 'dueTime' | 'assigneeId';

/** Reads the schedule sheet: a day (or a picked date), an optional time and who's cooking. */
export function parseScheduleForm(form: FormData, members: Profile[], today = todayISO()) {
	const values = {
		day: String(form.get('day') ?? ''),
		otherDate: String(form.get('otherDate') ?? ''),
		dueTime: String(form.get('dueTime') ?? ''),
		assigneeId: String(form.get('assigneeId') ?? '')
	};
	const errors: FieldErrors<ScheduleField> = {};

	const dueOn = values.day === 'other' ? values.otherDate : values.day;
	if (!isValidDateISO(dueOn)) errors.dueOn = 'Pick a day.';
	else if (dueOn < addDays(today, -1)) errors.dueOn = 'That day’s been and gone.';

	const dueTime = values.dueTime || null;
	if (dueTime && !isValidTime(dueTime)) errors.dueTime = 'That time doesn’t look right.';

	const assigneeId = values.assigneeId || null;
	if (assigneeId && !members.some((member) => member.id === assigneeId))
		errors.assigneeId = 'Pick someone in the household.';

	const input: ScheduleInput = { dueOn, dueTime, assigneeId };
	return { input, errors, values, valid: Object.keys(errors).length === 0 };
}

/** Schedules a recipe: a task carrying the recipe as it is now, scaled to the servings. */
export async function scheduleDinner(
	locals: App.Locals,
	recipe: Recipe,
	servings: number,
	input: ScheduleInput
): Promise<string> {
	const snapshot: DinnerSnapshot = {
		title: recipe.title,
		servings,
		ingredients: scaleIngredients(recipe, servings),
		steps: recipe.steps
	};
	const { supabase } = locals;
	if (!supabase) {
		const id = crypto.randomUUID();
		sampleTasks.push({
			id,
			title: cookTitle(recipe.title),
			notes: '',
			assigneeId: input.assigneeId,
			dueOn: input.dueOn,
			dueTime: input.dueTime,
			repeat: 'none',
			completedAt: null,
			completedBy: null,
			createdBy: myId(locals),
			recipeId: recipe.id,
			servings,
			recipe: snapshot
		});
		return id;
	}

	const householdId = await getHouseholdId(locals);
	const { data, error: insertError } = await supabase
		.from('tasks')
		.insert({
			household_id: householdId,
			title: cookTitle(recipe.title),
			assignee_id: input.assigneeId,
			due_on: input.dueOn,
			due_time: input.dueTime,
			recipe_id: recipe.id,
			servings,
			recipe: snapshot
		})
		.select('id')
		.single();
	if (insertError) error(500, insertError.message);
	return data.id;
}

/** A dinner task (404 for anything else). */
export async function getDinner(locals: App.Locals, taskId: string): Promise<Task> {
	const { supabase } = locals;
	let task: Task | undefined;
	if (!supabase) {
		task = sampleTasks.find((entry) => entry.id === taskId);
	} else if (UUID.test(taskId)) {
		const { data, error: readError } = await supabase
			.from('tasks')
			.select(TASK_COLUMNS)
			.eq('id', taskId)
			.maybeSingle();
		if (readError) error(500, readError.message);
		if (data) task = toTask(data);
	}
	if (!task?.recipe) error(404, 'That dinner isn’t on the calendar any more.');
	return task;
}

/** Moves a dinner to another day or time, or changes who's cooking. */
export async function rescheduleDinner(locals: App.Locals, taskId: string, input: ScheduleInput) {
	await getDinner(locals, taskId);
	const { supabase } = locals;
	if (!supabase) {
		const task = sampleTasks.find((entry) => entry.id === taskId)!;
		Object.assign(task, input, { completedAt: null, completedBy: null });
		return;
	}

	const { error: updateError } = await supabase
		.from('tasks')
		.update({
			due_on: input.dueOn,
			due_time: input.dueTime,
			assignee_id: input.assigneeId,
			completed_at: null
		})
		.eq('id', taskId);
	if (updateError) error(500, updateError.message);
}

/** Dinner's done: ticks the task off (it earns a point, like any chore). */
export async function markCooked(locals: App.Locals, taskId: string) {
	await getDinner(locals, taskId);
	await completeTask(locals, taskId);
}

/** Not happening after all: the dinner comes off the calendar. */
export async function skipDinner(locals: App.Locals, taskId: string) {
	await getDinner(locals, taskId);
	await deleteTask(locals, taskId);
}

/** When a dinner is due. With no time, it's treated as a 7pm dinner. */
const DEFAULT_DINNER_TIME = '19:00';
/** How long after the dinner's time before we ask whether it happened. */
const GRACE_MS = 60 * 60_000;
/** Dinners older than this are left alone. */
const LOOKBACK_DAYS = 10;

export interface DinnerPrompt {
	/** 'rate': cooked, so ask how it was. 'confirm': its time passed and it's still open. */
	kind: 'rate' | 'confirm';
	task: Task;
	/** Your current stars for the recipe, if you've rated it before. */
	stars: number | null;
}

export function dinnerTimePassed(task: Task, now = new Date()) {
	if (!task.dueOn) return false;
	const at = zonedToInstant(task.dueOn, task.dueTime ?? DEFAULT_DINNER_TIME).getTime();
	return now.getTime() >= at + GRACE_MS;
}

/**
 * The one card Plan dinner opens with, if any. A dinner that's been cooked asks you how it
 * was (once per person per dinner). A dinner whose time has passed but is still open asks
 * whether you made it first, so a dinner that moved to Thursday isn't rated on Wednesday.
 * The most recent dinner wins.
 */
export async function getDinnerPrompt(
	locals: App.Locals,
	myStars: Record<string, number>,
	now = new Date()
): Promise<DinnerPrompt | null> {
	const me = myId(locals);
	const since = addDays(todayISO(now), -LOOKBACK_DAYS);
	const { supabase } = locals;

	let dinners: Task[];
	let answered: Set<string>;
	if (!supabase) {
		dinners = sampleTasks.filter((task) => task.recipe && task.dueOn && task.dueOn >= since);
		answered = new Set(
			dinners.filter((task) => sampleCheckins.has(`${task.id}:${me}`)).map((task) => task.id)
		);
	} else {
		const householdId = await getHouseholdId(locals);
		const { data, error: readError } = await supabase
			.from('tasks')
			.select(TASK_COLUMNS)
			.eq('household_id', householdId)
			.not('recipe_id', 'is', null)
			.gte('due_on', since);
		if (readError) error(500, readError.message);
		dinners = (data ?? []).map(toTask);

		const ids = dinners.filter((task) => task.completedAt).map((task) => task.id);
		answered = new Set();
		if (ids.length) {
			const { data: rows, error: checkinError } = await supabase
				.from('dinner_checkins')
				.select('task_id')
				.eq('profile_id', me)
				.in('task_id', ids);
			if (checkinError) error(500, checkinError.message);
			for (const row of rows ?? []) answered.add(row.task_id);
		}
	}

	const candidates = dinners
		.map((task): DinnerPrompt | null => {
			if (task.completedAt)
				return answered.has(task.id)
					? null
					: { kind: 'rate', task, stars: myStars[task.recipeId!] ?? null };
			return dinnerTimePassed(task, now) ? { kind: 'confirm', task, stars: null } : null;
		})
		.filter((prompt): prompt is DinnerPrompt => prompt !== null)
		.sort((a, b) =>
			`${b.task.dueOn} ${b.task.dueTime ?? DEFAULT_DINNER_TIME}`.localeCompare(
				`${a.task.dueOn} ${a.task.dueTime ?? DEFAULT_DINNER_TIME}`
			)
		);
	return candidates[0] ?? null;
}
