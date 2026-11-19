import { fail } from '@sveltejs/kit';
import { listGroups } from '#lib/features/expenses/expenses.server.js';
import { FEED_PAGE, feedLimit, listFeed } from '#lib/features/feed/feed.server.js';
import { listActiveLists } from '#lib/features/lists/lists.server.js';
import { listUpcomingPlans, pickComingUp } from '#lib/features/plans/plans.server.js';
import { getScores } from '#lib/features/points/points.server.js';
import { completeTask, listTasksComingUp, reopenTask } from '#lib/features/tasks/tasks.server.js';
import { mergeComingUp } from '#lib/features/today/coming-up.js';
import { weekSummary } from '#lib/features/today/week.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const [plans, tasks, lists, scores, feed, groups] = await Promise.all([
		listUpcomingPlans(locals, 20),
		listTasksComingUp(locals),
		listActiveLists(locals),
		getScores(locals),
		// ?feed= grows as you scroll down the feed, so older posts stay loaded and refreshed.
		listFeed(locals, feedLimit(url.searchParams.get('feed'))),
		// Only for the week line's money bit.
		listGroups(locals)
	]);
	const week = weekSummary(locals, plans, tasks, groups);
	return {
		week: { plain: week.plain, fingerprint: week.key },
		comingUp: mergeComingUp(pickComingUp(plans, 6), tasks),
		lists: lists.slice(0, 4),
		scores,
		feed: { ...feed, pageSize: FEED_PAGE },
		today: todayISO()
	};
};

export const actions: Actions = {
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
