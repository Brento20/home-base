import { fail, redirect } from '@sveltejs/kit';
import {
	getPantry,
	getShopping,
	listPlannedDinners,
	shopForDinners
} from '#lib/features/recipes/dinner-shopping.server.js';
import { todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const today = todayISO();
	const [dinners, pantry, shopping] = await Promise.all([
		listPlannedDinners(locals, today),
		getPantry(locals),
		getShopping(locals)
	]);
	return {
		today,
		dinners,
		pantry: [...pantry],
		waiting: [...shopping.waiting],
		shoppingName: shopping.name
	};
};

export const actions: Actions = {
	/** Adds the ticked things for the ticked dinners to Shopping, then opens it. */
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const dinnerIds = form.getAll('dinner').map(String).slice(0, 30);
		const ticked = new Set(
			form
				.getAll('need')
				.map(String)
				.filter((key) => key.length <= 80)
		);
		if (!dinnerIds.length) return fail(400, { message: 'Tick at least one dinner.' });
		if (!ticked.size) return fail(400, { message: 'Tick at least one thing to buy.' });
		const { listId } = await shopForDinners(
			locals,
			todayISO(),
			dinnerIds,
			ticked,
			form.get('remember') === 'on'
		);
		redirect(303, `/lists/${listId}`);
	}
};
