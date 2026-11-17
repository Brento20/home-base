import { fail } from '@sveltejs/kit';
import { listPastTasks, reopenTask } from '#lib/features/tasks/tasks.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { tasks: await listPastTasks(locals), today: todayISO() };
};

export const actions: Actions = {
	undo: async ({ request, locals }) => {
		const taskId = String((await request.formData()).get('taskId') ?? '');
		if (!taskId) return fail(400, { message: 'Missing task.' });
		await reopenTask(locals, taskId);
	}
};
