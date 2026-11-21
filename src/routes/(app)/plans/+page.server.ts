import { gridRange, monthFromParam } from '#lib/features/plans/calendar.js';
import {
	listPlansBetween,
	listUpcomingPlansPage,
	PLANS_PAGE
} from '#lib/features/plans/plans.server.js';
import { listDinnersBetween } from '#lib/features/recipes/dinners.server.js';
import { graceFor, soonOrLater, unwrap } from '#lib/server/soon.js';
import { todayISO } from '#lib/time.js';
import type { PageServerLoad } from './$types';

/** Which way you last looked at Plans (list or month), so the Plans tab opens the same way. */
const VIEW_COOKIE = 'plans-view';

export const load: PageServerLoad = async ({ locals, url, cookies, isDataRequest }) => {
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

	// Each arrives whole when it can; otherwise the phone shows its last copy (or placeholders)
	// and it fills in (src/lib/server/soon.ts, src/lib/ui/kept.svelte.ts).
	if (view === 'list') {
		// The first page; more load from /plans/later as the end of the list nears.
		const list = listUpcomingPlansPage(locals, 0, PLANS_PAGE);
		return {
			view: 'list' as const,
			list: unwrap(await soonOrLater(list, graceFor('plans', isDataRequest, cookies))),
			today,
			now: new Date().toISOString()
		};
	}

	// The month's grid needs no data, so it never waits long for its entries: a swipe to another
	// month shows that month straight away, and its plans and dinners follow.
	const month = monthFromParam(url.searchParams.get('month'), today);
	const { from, until } = gridRange(month);
	const found = Promise.all([
		listPlansBetween(locals, from, until),
		listDinnersBetween(locals, from, until)
	]).then(([plans, dinners]) => ({ plans, dinners }));
	const entries = unwrap(
		await soonOrLater(found, graceFor(`plans-${month}`, isDataRequest, cookies))
	);
	return {
		view: 'calendar' as const,
		month,
		entries,
		today,
		now: new Date().toISOString()
	};
};
