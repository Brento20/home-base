import { fail } from '@sveltejs/kit';
import { getHousehold } from '#lib/features/household/household.server.js';
import {
	completeTask,
	reopenTask,
	createTask,
	listOpenTasks,
	parseTaskForm
} from '#lib/features/tasks/tasks.server.js';
import { todayISO } from '#lib/time.js';
import { graceFor, soonOrLater, unwrap } from '#lib/server/soon.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, isDataRequest }) => {
	// Arrives whole when it can; otherwise the phone shows its last copy (or placeholders) and
	// it fills in (src/lib/server/soon.ts, src/lib/ui/kept.svelte.ts).
	const screen = listOpenTasks(locals).then((tasks) => ({ tasks }));
	return {
		screen: unwrap(await soonOrLater(screen, graceFor('tasks', isDataRequest, cookies))),
		today: todayISO()
	};
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
