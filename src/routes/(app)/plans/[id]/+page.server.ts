import { getPlan } from '#lib/features/plans/plans.server.js';
import { todayISO } from '#lib/time.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	return { plan: await getPlan(locals, params.id), today: todayISO() };
};
