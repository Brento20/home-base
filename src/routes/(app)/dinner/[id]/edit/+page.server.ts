import { error, fail, redirect } from '@sveltejs/kit';
import { ingredientLine } from '#lib/features/recipes/recipe.js';
import {
	getRecipePhotoUrl,
	photoFromForm,
	removeRecipePhoto,
	saveRecipePhoto
} from '#lib/features/recipes/recipe-photos.server.js';
import { getRecipe, parseRecipeForm, updateRecipe } from '#lib/features/recipes/recipes.server.js';
import type { Actions, PageServerLoad } from './$types';

const text = (value: number | null) => (value === null ? '' : String(value));

export const load: PageServerLoad = async ({ locals, params }) => {
	const [recipe, photoUrl] = await Promise.all([
		getRecipe(locals, params.id),
		getRecipePhotoUrl(locals, params.id)
	]);
	if (!recipe.custom) error(404, 'Library recipes can’t be edited.');
	return {
		recipe: { id: recipe.id, title: recipe.title },
		photoUrl,
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
			notes: recipe.tips[0] ?? '',
			sourceNote: recipe.nutritionNote ?? ''
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const form = await request.formData();
		const { input, errors, values, valid } = parseRecipeForm(form);
		const { photo, problem } = photoFromForm(form);
		if (!valid || problem) {
			return fail(400, { values, errors: problem ? { ...errors, photo: problem } : errors });
		}
		await updateRecipe(locals, params.id, input);
		if (photo) await saveRecipePhoto(locals, params.id, photo);
		else if (form.get('removePhoto') === '1') await removeRecipePhoto(locals, params.id);
		redirect(303, `/dinner/${params.id}`);
	}
};
