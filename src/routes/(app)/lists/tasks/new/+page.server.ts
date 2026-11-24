import { fail, redirect } from '@sveltejs/kit';
import { getHousehold } from '#lib/features/household/household.server.js';
import { readTask } from '#lib/features/tasks/quick.server.js';
import { createTask, parseTaskForm } from '#lib/features/tasks/tasks.server.js';
import { aiConfigured } from '#lib/server/ai.js';
import { isValidDateISO, todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * A new task, on its own page like a new plan. ?title= carries over what was typed in the quick
 * add bar; ?date= comes from an empty day in the Plans calendar.
 */
export const load: PageServerLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? '';
	return {
		title: (url.searchParams.get('title') ?? '').slice(0, 160),
		date: isValidDateISO(date) ? date : ''
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { household } = await getHousehold(locals);
		const { input, errors, values, valid } = parseTaskForm(
			await request.formData(),
			household.members
		);
		if (!valid) return fail(400, { values, errors });
		await createTask(locals, input);
		redirect(303, '/lists/tasks');
	},

	/** The AI helper: fills who, when and how often from the words typed. */
	describe: async ({ request, locals }) => {
		const text = String((await request.formData()).get('text') ?? '')
			.trim()
			.slice(0, 300);
		if (!aiConfigured || !text) return { assist: 'failed' as const };
		const { household, me } = await getHousehold(locals);
		const values = await readTask(text, household.members, me, todayISO());
		if (!values) return { assist: 'failed' as const };
		return { assist: 'filled' as const, values: { ...values, notes: '' } };
	}
};
