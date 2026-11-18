import { fail, redirect } from '@sveltejs/kit';
import { getHousehold } from '#lib/features/household/household.server.js';
import { clampServings } from '#lib/features/recipes/recipe.js';
import { parseScheduleForm, scheduleDinner } from '#lib/features/recipes/dinners.server.js';
import {
	createShoppingList,
	deleteRecipe,
	getRecipe,
	getRecipeRatings,
	parseShoppingForm,
	parseStars,
	rateRecipe
} from '#lib/features/recipes/recipes.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const [recipe, ratings] = await Promise.all([
		getRecipe(locals, params.id),
		getRecipeRatings(locals, params.id)
	]);
	return { recipe, ratings, today: todayISO() };
};

export const actions: Actions = {
	rate: async ({ request, locals, params }) => {
		const stars = parseStars(await request.formData());
		if (!stars) return fail(400, { message: 'Pick from one to five stars.' });
		await rateRecipe(locals, params.id, stars);
		return { rated: stars };
	},

	shop: async ({ request, locals, params }) => {
		const recipe = await getRecipe(locals, params.id);
		const { servings, picked } = parseShoppingForm(await request.formData(), recipe);
		if (picked.length === 0) return fail(400, { message: 'Tick at least one thing to buy.' });
		const { listId, count } = await createShoppingList(locals, recipe, servings, picked);
		return { listId, count };
	},

	schedule: async ({ request, locals, params }) => {
		const [recipe, { household }, form] = await Promise.all([
			getRecipe(locals, params.id),
			getHousehold(locals),
			request.formData()
		]);
		const { input, errors, valid } = parseScheduleForm(form, household.members);
		if (!valid) return fail(400, { errors });
		const servings = clampServings(Number(form.get('servings')));
		const taskId = await scheduleDinner(locals, recipe, servings, input);
		return { taskId, ...input };
	},

	delete: async ({ locals, params }) => {
		await deleteRecipe(locals, params.id);
		redirect(303, '/dinner');
	}
};
