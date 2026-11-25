import { fail, redirect } from '@sveltejs/kit';
import { getGroup, parseExpenseForm } from '#lib/features/expenses/expenses.server.js';
import { expenseFormValues } from '#lib/features/expenses/form.js';
import { isFrequency } from '#lib/features/expenses/recurring.js';
import {
	getRecurring,
	setRecurringPaused,
	stopRecurring,
	updateRecurring
} from '#lib/features/expenses/recurring.server.js';
import { isValidDateISO, todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { group, me } = await parent();
	const bill = await getRecurring(locals, group.id, params.billId);
	// The form shows the bill as an expense, dated its next bill.
	const values = expenseFormValues(group.memberIds, me.id, {
		...bill,
		id: bill.id,
		spentOn: bill.nextOn,
		createdAt: ''
	});
	return { bill, values };
};

export const actions: Actions = {
	/** Changes what it adds and how often, from the next bill on. */
	save: async ({ request, locals, params }) => {
		const group = await getGroup(locals, params.groupId);
		const bill = await getRecurring(locals, group.id, params.billId);
		const form = await request.formData();
		const repeat = form.get('repeat');
		const { values, errors, input } = parseExpenseForm(form, group.memberIds);
		if (input && isValidDateISO(input.spentOn) && input.spentOn < todayISO())
			errors.spentOn = 'The next bill can be today or later.';
		if (!input || errors.spentOn || !isFrequency(repeat)) return fail(400, { values, errors });

		const { message } = await updateRecurring(locals, bill, input, repeat);
		if (message) return fail(400, { values, errors: { split: message } });
		redirect(303, `/money/${group.id}`);
	},

	pause: async ({ locals, params }) => {
		const bill = await getRecurring(locals, params.groupId, params.billId);
		await setRecurringPaused(locals, bill, !bill.paused);
	},

	/** Stops it repeating; what it already added stays. */
	stop: async ({ locals, params }) => {
		const bill = await getRecurring(locals, params.groupId, params.billId);
		await stopRecurring(locals, bill);
		redirect(303, `/money/${params.groupId}`);
	}
};
