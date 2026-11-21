import { fail, redirect } from '@sveltejs/kit';
import {
	deletePlan,
	getPlan,
	parsePlanForm,
	planToFormValues,
	updatePlan
} from '#lib/features/plans/plans.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const plan = await getPlan(locals, params.id);
	// Another home's plan: only they can change it.
	if (plan.invitedBy) redirect(303, `/plans/${plan.id}`);
	return { plan, values: planToFormValues(plan) };
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const { input, errors, values, valid } = parsePlanForm(await request.formData());
		if (!valid || !input) return fail(400, { values, errors });

		await updatePlan(locals, params.id, input);
		redirect(303, `/plans/${params.id}`);
	},

	delete: async ({ locals, params }) => {
		await deletePlan(locals, params.id);
		redirect(303, '/plans');
	}
};
