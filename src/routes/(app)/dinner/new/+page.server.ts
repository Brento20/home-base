import { fail, redirect } from '@sveltejs/kit';
import { createRecipe, parseRecipeForm } from '#lib/features/recipes/recipes.server.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { input, errors, values, valid } = parseRecipeForm(await request.formData());
		if (!valid) return fail(400, { values, errors });
		const id = await createRecipe(locals, input);
		redirect(303, `/dinner/${id}`);
	}
};
