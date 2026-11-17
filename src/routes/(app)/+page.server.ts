import { fail } from '@sveltejs/kit';
import { FEED_PAGE, feedLimit, listFeed } from '#lib/features/feed/feed.server.js';
import { listActiveLists } from '#lib/features/lists/lists.server.js';
import { listUpcomingPlans, pickComingUp } from '#lib/features/plans/plans.server.js';
import { getScores } from '#lib/features/points/points.server.js';
import { completeTask, listTasksComingUp } from '#lib/features/tasks/tasks.server.js';
import { mergeComingUp } from '#lib/features/today/coming-up.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const [plans, tasks, lists, scores, feed] = await Promise.all([
		listUpcomingPlans(locals, 20),
		listTasksComingUp(locals),
		listActiveLists(locals),
		getScores(locals),
		// ?feed= grows as you scroll down the feed, so older posts stay loaded and refreshed.
		listFeed(locals, feedLimit(url.searchParams.get('feed')))
	]);
	return {
		comingUp: mergeComingUp(pickComingUp(plans, 6), tasks),
		lists: lists.slice(0, 4),
		scores,
		feed: { ...feed, pageSize: FEED_PAGE },
		today: todayISO()
	};
};

export const actions: Actions = {
	completeTask: async ({ request, locals }) => {
		const taskId = String((await request.formData()).get('taskId') ?? '');
		if (!taskId) return fail(400, { message: 'Missing task.' });
		await completeTask(locals, taskId);
	}
};
