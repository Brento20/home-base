import { fail, redirect } from '@sveltejs/kit';
import { getHousehold } from '#lib/features/household/household.server.js';
import { getTask, parseTaskForm, updateTask } from '#lib/features/tasks/tasks.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const task = await getTask(locals, params.id);
	// A dinner is changed from its cook view.
	if (task.recipe) redirect(307, `/dinner/cook/${task.id}`);
	return { task };
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const { household } = await getHousehold(locals);
		const { input, errors, values, valid } = parseTaskForm(
			await request.formData(),
			household.members
		);
		if (!valid) return fail(400, { values, errors });

		await updateTask(locals, params.id, input);
		redirect(303, `/lists/tasks/${params.id}`);
	}
};
