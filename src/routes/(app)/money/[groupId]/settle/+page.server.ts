import { fail, redirect } from '@sveltejs/kit';
import {
	getGroup,
	getGroupBalances,
	parseSettlementForm,
	recordSettlement
} from '#lib/features/expenses/expenses.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { group, me } = await parent();
	const { debts } = await getGroupBalances(locals, group);
	// Start with the repayment that involves you, if there is one.
	const suggested = debts.find((d) => d.from === me.id || d.to === me.id) ?? debts[0] ?? null;
	return { debts, suggested, today: todayISO() };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const group = await getGroup(locals, params.groupId);
		const { values, amountCents, errors, valid } = parseSettlementForm(
			await request.formData(),
			group.memberIds
		);
		if (!valid) return fail(400, { values, errors, message: null });

		const { message } = await recordSettlement(locals, group.id, values, amountCents);
		if (message) return fail(400, { values, errors: {} as typeof errors, message });

		redirect(303, `/money/${group.id}`);
	}
};
