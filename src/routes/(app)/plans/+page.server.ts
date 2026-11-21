import { gridRange, monthFromParam } from '#lib/features/plans/calendar.js';
import {
	listPlansBetween,
	listUpcomingPlansPage,
	PLANS_PAGE
} from '#lib/features/plans/plans.server.js';
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
		// The first page; "Show later plans" fetches more from /plans/later.
		const { plans, hasMore } = await listUpcomingPlansPage(locals, 0, PLANS_PAGE);
		return {
			view: 'list' as const,
			plans,
			hasMore,
			today,
			now: new Date().toISOString()
		};
	}

	// The month's grid needs no data, so its entries aren't waited for: a swipe to another
	// month shows that month straight away, and its plans and dinners follow.
	const month = monthFromParam(url.searchParams.get('month'), today);
	const { from, until } = gridRange(month);
	const entries = Promise.all([
		listPlansBetween(locals, from, until),
		listDinnersBetween(locals, from, until)
	]).then(([plans, dinners]) => ({ plans, dinners }));
	entries.catch(() => {}); // a failure shows in the page; don't let it go unhandled here
	return {
		view: 'calendar' as const,
		month,
		entries,
		today,
		now: new Date().toISOString()
	};
};
