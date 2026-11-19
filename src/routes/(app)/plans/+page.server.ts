import { gridRange, monthFromParam } from '#lib/features/plans/calendar.js';
import { listPlansBetween, listUpcomingPlans } from '#lib/features/plans/plans.server.js';
import { listDinnersBetween } from '#lib/features/recipes/dinners.server.js';
import { todayISO } from '#lib/time.js';
import type { PageServerLoad } from './$types';

/** Which way you last looked at Plans (list or month), so the Plans tab opens the same way. */
const VIEW_COOKIE = 'plans-view';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const today = todayISO();
	const asked = url.searchParams.get('view');
	if (asked === 'list' || asked === 'calendar') {
		cookies.set(VIEW_COOKIE, asked, {
			path: '/plans',
			maxAge: 60 * 60 * 24 * 365,
			httpOnly: true,
			sameSite: 'lax'
		});
	}
	const view =
		asked === 'calendar' || (!asked && cookies.get(VIEW_COOKIE) === 'calendar')
			? 'calendar'
			: 'list';

	if (view === 'list') {
		return {
			view: 'list' as const,
			plans: await listUpcomingPlans(locals),
			today,
			now: new Date().toISOString()
		};
	}

	const month = monthFromParam(url.searchParams.get('month'), today);
	const { from, until } = gridRange(month);
	const [plans, dinners] = await Promise.all([
		listPlansBetween(locals, from, until),
		listDinnersBetween(locals, from, until)
	]);
	return {
		view: 'calendar' as const,
		month,
		plans,
		dinners,
		today,
		now: new Date().toISOString()
	};
};
