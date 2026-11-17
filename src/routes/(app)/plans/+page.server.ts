import { listUpcomingPlans } from '#lib/features/plans/plans.server.js';
import { todayISO } from '#lib/time.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		plans: await listUpcomingPlans(locals),
		today: todayISO(),
		now: new Date().toISOString()
	};
};
