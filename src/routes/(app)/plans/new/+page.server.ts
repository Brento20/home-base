import { fail, redirect } from '@sveltejs/kit';
import { createPlan, parsePlanForm } from '#lib/features/plans/plans.server.js';
import { isValidDateISO, todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const requested = url.searchParams.get('date') ?? '';
	return { date: isValidDateISO(requested) ? requested : todayISO() };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { input, errors, values, valid } = parsePlanForm(await request.formData());
		if (!valid || !input) return fail(400, { values, errors });

		const id = await createPlan(locals, input);
		redirect(303, `/plans/${id}`);
	}
};
