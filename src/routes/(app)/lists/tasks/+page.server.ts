import { fail } from '@sveltejs/kit';
import { getHousehold } from '#lib/features/household/household.server.js';
import {
	completeTask,
	reopenTask,
	createTask,
	listOpenTasks,
	parseTaskForm
} from '#lib/features/tasks/tasks.server.js';
import { readTask } from '#lib/features/tasks/quick.server.js';
import { aiConfigured } from '#lib/server/ai.js';
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

	/** ✨ in the add field: fills who, when and how often from the words typed. */
	quick: async ({ request, locals }) => {
		const text = String((await request.formData()).get('title') ?? '')
			.trim()
			.slice(0, 300);
		if (!text)
			return fail(400, { values: { title: '' }, errors: { title: 'Type the task first.' } });
		if (!aiConfigured) return { assist: 'failed' as const, values: { title: text } };

		const { household, me } = await getHousehold(locals);
		const values = await readTask(text, household.members, me, todayISO());
		if (!values) return { assist: 'failed' as const, values: { title: text } };
		return { assist: 'filled' as const, values };
	},

	/** The Undo in the toast after ticking something off. */
	undo: async ({ request, locals }) => {
		const taskId = String((await request.formData()).get('taskId') ?? '');
		if (!taskId) return fail(400, { message: 'Missing task.' });
		await reopenTask(locals, taskId);
	},

	complete: async ({ request, locals }) => {
		const form = await request.formData();
		const taskId = String(form.get('taskId') ?? '');
		if (!taskId) return fail(400, { message: 'Missing task.' });
		await completeTask(locals, taskId);
		// For the "Ticked off · Undo" toast.
		return { ticked: { id: taskId, title: String(form.get('title') ?? '').slice(0, 160) } };
	}
};
