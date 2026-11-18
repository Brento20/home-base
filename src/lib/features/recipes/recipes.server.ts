import { error } from '@sveltejs/kit';
import { getHouseholdId, myId } from '#lib/features/household/household.server.js';
import { addListItems, createList } from '#lib/features/lists/lists.server.js';
import { dbError } from '#lib/server/db.js';
import { sampleHomeRecipes, sampleRatings } from '#lib/server/sample-data.js';
import type { FieldErrors } from '#lib/types.js';
import { checkInRecipe } from './dinners.server.js';
import library from './library.json';
import {
	clampServings,
	parseIngredientLine,
	scaleIngredients,
	shoppingLine,
	summarise,
	type Ingredient,
	type Nutrition,
	type Recipe
} from './recipe.js';

/**
 * Plan dinner's recipes: the library (which ships with the app), recipes a home adds
 * (public.recipes), ratings (one per person per recipe) and shopping lists made from a recipe.
 * Scheduled dinners are in dinners.server.ts. Sample mode keeps all of it in memory.
 */

const LIBRARY = (library as Omit<Recipe, 'custom'>[]).map((recipe) => ({
	...recipe,
	custom: false
})) as Recipe[];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
	if (readError) dbError(readError);
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
	if (readError) dbError(readError);
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
	if (insertError) dbError(insertError);
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
	if (updateError) dbError(updateError);
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
	if (deleteError) dbError(deleteError);
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
	if (readError) dbError(readError);
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
	if (readError) dbError(readError);
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
	if (upsertError) dbError(upsertError);
	await checkInRecipe(locals, recipeId, taskId);
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
