import { fail, redirect } from '@sveltejs/kit';
import { getHousehold } from '#lib/features/household/household.server.js';
import { getGroup, parseExpenseForm, saveExpense } from '#lib/features/expenses/expenses.server.js';
import { expenseFormValues } from '#lib/features/expenses/form.js';
import { readReceipt } from '#lib/features/expenses/receipt.server.js';
import { aiConfigured } from '#lib/server/ai.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { group, me } = await parent();
	return { values: expenseFormValues(group.memberIds, me.id) };
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const group = await getGroup(locals, params.groupId);
		const { values, errors, input } = parseExpenseForm(await request.formData(), group.memberIds);
		if (!input) return fail(400, { values, errors });

		const { message } = await saveExpense(locals, group.id, null, input);
		if (message) return fail(400, { values, errors: { split: message } });

		redirect(303, `/money/${group.id}`);
	},

	/** "Snap a receipt": fills the form from the photo, or says to fill it in by hand. */
	receipt: async ({ request, locals, params }) => {
		if (!aiConfigured) return { assist: 'failed' as const };
		const group = await getGroup(locals, params.groupId);
		const { me } = await getHousehold(locals);
		const start = expenseFormValues(group.memberIds, me.id);
		const values = await readReceipt((await request.formData()).get('photo'), start, todayISO());
		if (!values) return { assist: 'failed' as const };
		return { assist: 'filled' as const, values };
	}
};
