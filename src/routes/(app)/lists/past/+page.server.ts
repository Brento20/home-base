import { listPastLists } from '#lib/features/lists/lists.server.js';
import { todayISO } from '#lib/time.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { lists: await listPastLists(locals), today: todayISO() };
};
