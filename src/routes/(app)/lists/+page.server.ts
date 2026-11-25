import { fail, redirect } from '@sveltejs/kit';
import { createList, listActiveLists, parseListName } from '#lib/features/lists/lists.server.js';
import { countPlannedDinners } from '#lib/features/recipes/dinner-shopping.server.js';
import { todayISO } from '#lib/time.js';
import { graceFor, soonOrLater, unwrap } from '#lib/server/soon.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, isDataRequest }) => {
	// Arrives whole when it can; otherwise the phone shows its last copy (or placeholders) and
	// it fills in (src/lib/server/soon.ts, src/lib/ui/kept.svelte.ts).
	// `dinners`: how many are planned this week, for the Shop for dinners row.
	const screen = Promise.all([
		listActiveLists(locals),
		countPlannedDinners(locals, todayISO())
	]).then(([lists, dinners]) => ({ lists, dinners }));
	return {
		screen: unwrap(await soonOrLater(screen, graceFor('lists', isDataRequest, cookies))),
		today: todayISO()
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { name, errors, valid } = parseListName(await request.formData());
		if (!valid) return fail(400, { name, errors });

		const id = await createList(locals, name);
		redirect(303, `/lists/${id}`);
	}
};
