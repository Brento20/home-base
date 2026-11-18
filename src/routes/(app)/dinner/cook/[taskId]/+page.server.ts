import { fail, redirect } from '@sveltejs/kit';
import { getHousehold } from '#lib/features/household/household.server.js';
import {
	getDinner,
	getMyStars,
	markCooked,
	parseScheduleForm,
	parseStars,
	rateRecipe,
	rescheduleDinner,
	skipDinner
} from '#lib/features/recipes/recipes.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const [task, myStars] = await Promise.all([getDinner(locals, params.taskId), getMyStars(locals)]);
	return { task, stars: myStars[task.recipeId!] ?? null, today: todayISO() };
};

export const actions: Actions = {
	cooked: async ({ locals, params }) => {
		await markCooked(locals, params.taskId);
		redirect(303, '/');
	},

	reschedule: async ({ request, locals, params }) => {
		const [form, { household }] = await Promise.all([request.formData(), getHousehold(locals)]);
		const { input, errors, valid } = parseScheduleForm(form, household.members);
		if (!valid) return fail(400, { errors });
		await rescheduleDinner(locals, params.taskId, input);
		return { taskId: params.taskId, ...input };
	},

	skip: async ({ locals, params }) => {
		await skipDinner(locals, params.taskId);
		redirect(303, '/');
	},

	rate: async ({ request, locals, params }) => {
		const stars = parseStars(await request.formData());
		if (!stars) return fail(400, { message: 'Pick from one to five stars.' });
		const task = await getDinner(locals, params.taskId);
		await rateRecipe(locals, task.recipeId!, stars, task.id);
		return { rated: stars };
	}
};
