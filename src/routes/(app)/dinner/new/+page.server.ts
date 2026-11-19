import { fail, redirect } from '@sveltejs/kit';
import { importRecipe } from '#lib/features/recipes/import.server.js';
import { createRecipe, parseRecipeForm } from '#lib/features/recipes/recipes.server.js';
import { aiConfigured } from '#lib/server/ai.js';
import type { Actions } from './$types';

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { input, errors, values, valid } = parseRecipeForm(await request.formData());
		if (!valid) return fail(400, { values, errors });
		const id = await createRecipe(locals, input);
		redirect(303, `/dinner/${id}`);
	},

	/** The import box: fills the form for checking, or says to fill it in by hand. */
	import: async ({ request }) => {
		if (!aiConfigured) return { assist: 'failed' as const };
		const imported = await importRecipe(await request.formData());
		if (!imported) return { assist: 'failed' as const };
		return { assist: 'filled' as const, values: imported.values, source: imported.source };
	}
};
