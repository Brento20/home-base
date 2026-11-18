import { error, fail, redirect } from '@sveltejs/kit';
import { ingredientLine } from '#lib/features/recipes/recipe.js';
import { getRecipe, parseRecipeForm, updateRecipe } from '#lib/features/recipes/recipes.server.js';
import type { Actions, PageServerLoad } from './$types';

const text = (value: number | null) => (value === null ? '' : String(value));

export const load: PageServerLoad = async ({ locals, params }) => {
	const recipe = await getRecipe(locals, params.id);
	if (!recipe.custom) error(404, 'Library recipes can’t be edited.');
	return {
		recipe: { id: recipe.id, title: recipe.title },
		values: {
			title: recipe.title,
			baseServings: String(recipe.baseServings),
			prepMinutes: String(recipe.prepMinutes || ''),
			cookMinutes: String(recipe.cookMinutes || ''),
			restMinutes: String(recipe.restMinutes || ''),
			cuisine: recipe.cuisine ?? '',
			isVegetarian: recipe.isVegetarian,
			isVegan: recipe.isVegan,
			proteins: recipe.proteins,
			ingredients: recipe.ingredients.map(ingredientLine).join('\n'),
			steps: recipe.steps.join('\n'),
			energyKj: text(recipe.nutrition?.energyKj ?? null),
			proteinG: text(recipe.nutrition?.proteinG ?? null),
			carbsG: text(recipe.nutrition?.carbsG ?? null),
			fatG: text(recipe.nutrition?.fatG ?? null),
			sugarsG: text(recipe.nutrition?.sugarsG ?? null),
			fibreG: text(recipe.nutrition?.fibreG ?? null),
			notes: recipe.tips[0] ?? ''
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const { input, errors, values, valid } = parseRecipeForm(await request.formData());
		if (!valid) return fail(400, { values, errors });
		await updateRecipe(locals, params.id, input);
		redirect(303, `/dinner/${params.id}`);
	}
};
