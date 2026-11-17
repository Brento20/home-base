import { fail } from '@sveltejs/kit';
import { listActiveLists } from '#lib/features/lists/lists.server.js';
import { listUpcomingPlans, pickComingUp } from '#lib/features/plans/plans.server.js';
import { getScores } from '#lib/features/points/points.server.js';
import { completeTask, listTasksComingUp } from '#lib/features/tasks/tasks.server.js';
import { mergeComingUp } from '#lib/features/today/coming-up.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [plans, tasks, lists, scores] = await Promise.all([
		listUpcomingPlans(locals, 20),
		listTasksComingUp(locals),
		listActiveLists(locals),
		getScores(locals)
	]);
	return {
		comingUp: mergeComingUp(pickComingUp(plans, 6), tasks),
		lists: lists.slice(0, 4),
		scores,
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
