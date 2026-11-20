import { redirect } from '@sveltejs/kit';
import { completeTask, deleteTask, getTask, reopenTask } from '#lib/features/tasks/tasks.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

/** A task's details. Changing them is on ./edit; deleting stays here, at the foot. */
export const load: PageServerLoad = async ({ locals, params }) => {
	const task = await getTask(locals, params.id);
	// A dinner opens in the cook view, with the recipe right there.
	if (task.recipe) redirect(307, `/dinner/cook/${task.id}`);
	return { task, today: todayISO() };
};

export const actions: Actions = {
	complete: async ({ locals, params }) => {
		await completeTask(locals, params.id);
		redirect(303, '/lists/tasks');
	},

	reopen: async ({ locals, params }) => {
		await reopenTask(locals, params.id);
	},

	delete: async ({ locals, params }) => {
		await deleteTask(locals, params.id);
		redirect(303, '/lists/tasks');
	}
};
