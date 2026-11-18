import { fail } from '@sveltejs/kit';
import { getHousehold } from '#lib/features/household/household.server.js';
import {
	checkIn,
	getDinnerPrompt,
	markCooked,
	parseScheduleForm,
	rescheduleDinner,
	skipDinner
} from '#lib/features/recipes/dinners.server.js';
import {
	getMyStars,
	listRecipeSummaries,
	parseStars,
	rateRecipe
} from '#lib/features/recipes/recipes.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [recipes, myStars] = await Promise.all([listRecipeSummaries(locals), getMyStars(locals)]);
	const prompt = await getDinnerPrompt(locals, myStars);
	return { recipes, myStars, prompt, today: todayISO() };
};

const taskIdFrom = (form: FormData) => String(form.get('taskId') ?? '');

export const actions: Actions = {
	// "How was it?": your stars for the recipe, and this dinner counts as answered.
	rate: async ({ request, locals }) => {
		const form = await request.formData();
		const stars = parseStars(form);
		const recipeId = String(form.get('recipeId') ?? '');
		if (!stars || !recipeId) return fail(400, { message: 'Pick from one to five stars.' });
		await rateRecipe(locals, recipeId, stars, taskIdFrom(form) || null);
		return { rated: stars };
	},

	dismiss: async ({ request, locals }) => {
		await checkIn(locals, taskIdFrom(await request.formData()));
	},

	// "Did you make it?" → Yes. Then it asks how it was.
	cooked: async ({ request, locals }) => {
		await markCooked(locals, taskIdFrom(await request.formData()));
	},

	reschedule: async ({ request, locals }) => {
		const [form, { household }] = await Promise.all([request.formData(), getHousehold(locals)]);
		const { input, errors, valid } = parseScheduleForm(form, household.members);
		if (!valid) return fail(400, { errors });
		await rescheduleDinner(locals, taskIdFrom(form), input);
		return { taskId: taskIdFrom(form), ...input };
	},

	skip: async ({ request, locals }) => {
		await skipDinner(locals, taskIdFrom(await request.formData()));
	}
};
