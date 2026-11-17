import { fail } from '@sveltejs/kit';
import { getHousehold } from '#lib/features/household/household.server.js';
import {
	completeTask,
	createTask,
	listOpenTasks,
	parseTaskForm
} from '#lib/features/tasks/tasks.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { tasks: await listOpenTasks(locals), today: todayISO() };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const { household } = await getHousehold(locals);
		const { input, errors, values, valid } = parseTaskForm(
			await request.formData(),
			household.members
		);
		if (!valid) return fail(400, { values, errors });

		await createTask(locals, input);
		return { added: input.title };
	},

	complete: async ({ request, locals }) => {
		const taskId = String((await request.formData()).get('taskId') ?? '');
		if (!taskId) return fail(400, { message: 'Missing task.' });
		await completeTask(locals, taskId);
	}
};
