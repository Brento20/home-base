import { fail, type Cookies } from '@sveltejs/kit';
import { listGroups } from '#lib/features/expenses/expenses.server.js';
import { FEED_PAGE, hasAnyPost, listFeed } from '#lib/features/feed/feed.server.js';
import { listActiveLists } from '#lib/features/lists/lists.server.js';
import { listUpcomingPlans, pickComingUp } from '#lib/features/plans/plans.server.js';
import { getScores } from '#lib/features/points/points.server.js';
import { completeTask, listTasksComingUp, reopenTask } from '#lib/features/tasks/tasks.server.js';
import { mergeComingUp } from '#lib/features/today/coming-up.js';
import { allDone, START_COOKIE, startSteps } from '#lib/features/today/getting-started.js';
import { weekSummary } from '#lib/features/today/week.server.js';
import { todayISO } from '#lib/time.js';
import { LIVE_DATA } from '#lib/live-data.js';
import { graceFor, soonOrLater, unwrap } from '#lib/server/soon.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent, cookies, depends, isDataRequest }) => {
	// Reloaded every minute while it's showing (live-refresh.ts), without the shared layout.
	depends(LIVE_DATA);
	// The feed is below the fold, so it never holds the screen up: the posts follow a moment
	// later. Just the newest few: older ones load from /feed/older as you scroll.
	const feed = listFeed(locals).then((page) => ({ ...page, pageSize: FEED_PAGE }));
	feed.catch(() => {}); // a failure shows in the page; don't let it go unhandled here

	const starting = !cookies.get(START_COOKIE);
	const screen = (async () => {
		const [plans, tasks, lists, scores, groups, posted, { household }] = await Promise.all([
			listUpcomingPlans(locals, 20),
			listTasksComingUp(locals),
			listActiveLists(locals),
			getScores(locals),
			// For the line under the date: who owes whom.
			listGroups(locals),
			// Only a new home's getting-started card needs to know.
			starting ? hasAnyPost(locals) : true,
			parent()
		]);
		const week = weekSummary(locals, plans, tasks, groups, household.members);

		// First things for a new home, from what's already loaded. Once they're done (or the
		// card's dismissed) a cookie keeps it gone, even if the home later empties out.
		let start = starting
			? startSteps({
					members: household.members.length,
					tasks: tasks.length,
					plans: plans.length,
					posts: posted ? 1 : 0
				})
			: null;
		if (start && allDone(start)) {
			// Too late once the screen has been streamed; the next load tries again.
			try {
				rememberStarted(cookies);
			} catch {
				// Headers already sent.
			}
			start = null;
		}

		return {
			start,
			week: { plain: week.plain, fingerprint: week.key },
			comingUp: mergeComingUp(pickComingUp(plans, 6), tasks),
			lists: lists.slice(0, 4),
			scores
		};
	})();

	// Arrives whole when it can; otherwise the phone shows its last copy, or placeholders, and
	// this fills in (src/lib/server/soon.ts, src/lib/ui/kept.svelte.ts).
	const soon = await soonOrLater(screen, graceFor('today', isDataRequest, cookies));
	return { screen: unwrap(soon), feed, today: todayISO() };
};

function rememberStarted(cookies: Cookies) {
	cookies.set(START_COOKIE, '1', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 31_536_000
	});
}

export const actions: Actions = {
	dismissStart: async ({ cookies }) => {
		rememberStarted(cookies);
		return { dismissed: true };
	},

	completeTask: async ({ request, locals }) => {
		const form = await request.formData();
		const taskId = String(form.get('taskId') ?? '');
		if (!taskId) return fail(400, { message: 'Missing task.' });
		await completeTask(locals, taskId);
		// For the "Ticked off · Undo" toast.
		return { ticked: { id: taskId, title: String(form.get('title') ?? '').slice(0, 160) } };
	},

	/** The Undo in the toast after ticking a chore off a card. */
	undoTask: async ({ request, locals }) => {
		const taskId = String((await request.formData()).get('taskId') ?? '');
		if (!taskId) return fail(400, { message: 'Missing task.' });
		await reopenTask(locals, taskId);
	}
};
