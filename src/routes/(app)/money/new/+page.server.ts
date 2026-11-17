import { fail, redirect } from '@sveltejs/kit';
import { createGroup, parseGroupForm } from '#lib/features/expenses/expenses.server.js';
import { getHousehold } from '#lib/features/household/household.server.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { household, me } = await getHousehold(locals);
		const { name, memberIds, errors, valid } = parseGroupForm(
			await request.formData(),
			household.members.map((person) => person.id),
			me.id
		);
		if (!valid) return fail(400, { name, memberIds, errors, message: null });

		const { id, message } = await createGroup(locals, name, memberIds);
		if (!id) return fail(400, { name, memberIds, errors: {} as typeof errors, message });

		redirect(303, `/money/${id}`);
	}
};
