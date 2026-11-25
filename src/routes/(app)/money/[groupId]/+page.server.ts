import { getGroupBalances, listActivity } from '#lib/features/expenses/expenses.server.js';
import { addDueRecurring, listRecurring } from '#lib/features/expenses/recurring.server.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { group } = await parent();
	// Bills that have come due go in first, so the balance includes them.
	await addDueRecurring(locals);
	const [{ balances, debts }, activity, recurring] = await Promise.all([
		getGroupBalances(locals, group),
		listActivity(locals, group.id),
		listRecurring(locals, group.id)
	]);
	return { balances, debts, activity, recurring };
};
