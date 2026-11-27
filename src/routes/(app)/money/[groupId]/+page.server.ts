import { getGroupBalances, listActivity } from '#lib/features/expenses/expenses.server.js';
import {
	addDueRecurring,
	billsDueCheck,
	listRecurring
} from '#lib/features/expenses/recurring.server.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent, params, cookies }) => {
	// Bills that have come due go in first, so the balance includes them: once a day from this
	// phone (most visits skip straight past).
	const bills = billsDueCheck(cookies) ? addDueRecurring(locals) : Promise.resolve(0);
	// These only need the group's id, so they start now rather than after the group is read.
	const recurring = bills.then(() => listRecurring(locals, params.groupId));
	const activity = bills.then(() => listActivity(locals, params.groupId));
	// Handled below; this just stops an unknown group's 404 leaving them unhandled.
	activity.catch(() => {});
	recurring.catch(() => {});
	const [{ group }] = await Promise.all([parent(), bills]);
	const [{ balances, debts }, activityList, recurringList] = await Promise.all([
		getGroupBalances(locals, group),
		activity,
		recurring
	]);
	return { balances, debts, activity: activityList, recurring: recurringList };
};
