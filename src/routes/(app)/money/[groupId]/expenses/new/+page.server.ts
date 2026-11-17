import { fail, redirect } from '@sveltejs/kit';
import { getGroup, parseExpenseForm, saveExpense } from '#lib/features/expenses/expenses.server.js';
import { expenseFormValues } from '#lib/features/expenses/form.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { group, me } = await parent();
	return { values: expenseFormValues(group.memberIds, me.id) };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const group = await getGroup(locals, params.groupId);
		const { values, errors, input } = parseExpenseForm(await request.formData(), group.memberIds);
		if (!input) return fail(400, { values, errors });

		const { message } = await saveExpense(locals, group.id, null, input);
		if (message) return fail(400, { values, errors: { split: message } });

		redirect(303, `/money/${group.id}`);
	}
};
