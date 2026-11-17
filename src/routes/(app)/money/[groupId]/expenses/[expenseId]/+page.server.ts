import { fail, redirect } from '@sveltejs/kit';
import {
	deleteExpense,
	getExpense,
	getGroup,
	parseExpenseForm,
	saveExpense
} from '#lib/features/expenses/expenses.server.js';
import { expenseFormValues } from '#lib/features/expenses/form.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { group, me } = await parent();
	const expense = await getExpense(locals, group.id, params.expenseId);
	return { expense, values: expenseFormValues(group.memberIds, me.id, expense) };
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const group = await getGroup(locals, params.groupId);
		const { values, errors, input } = parseExpenseForm(await request.formData(), group.memberIds);
		if (!input) return fail(400, { values, errors });

		const { message } = await saveExpense(locals, group.id, params.expenseId, input);
		if (message) return fail(400, { values, errors: { split: message } });

		redirect(303, `/money/${group.id}`);
	},

	delete: async ({ locals, params }) => {
		await deleteExpense(locals, params.groupId, params.expenseId);
		redirect(303, `/money/${params.groupId}`);
	}
};
