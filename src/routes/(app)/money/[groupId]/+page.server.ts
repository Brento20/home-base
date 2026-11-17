import { getGroupBalances, listActivity } from '#lib/features/expenses/expenses.server.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { group } = await parent();
	const [{ balances, debts }, activity] = await Promise.all([
		getGroupBalances(locals, group),
		listActivity(locals, group.id)
	]);
	return { balances, debts, activity };
};
