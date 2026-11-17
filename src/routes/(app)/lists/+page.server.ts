import { fail, redirect } from '@sveltejs/kit';
import { createList, listActiveLists, parseListName } from '#lib/features/lists/lists.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { lists: await listActiveLists(locals), today: todayISO() };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { name, errors, valid } = parseListName(await request.formData());
		if (!valid) return fail(400, { name, errors });

		const id = await createList(locals, name);
		redirect(303, `/lists/${id}`);
	}
};
