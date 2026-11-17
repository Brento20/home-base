import { listGroups } from '#lib/features/expenses/expenses.server.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { groups: await listGroups(locals) };
};
