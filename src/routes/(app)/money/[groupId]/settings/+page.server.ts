import { fail } from '@sveltejs/kit';
import { addGroupMembers, getGroup, renameGroup } from '#lib/features/expenses/expenses.server.js';
import { getHousehold } from '#lib/features/household/household.server.js';
import type { Actions } from './$types';

export const actions: Actions = {
	rename: async ({ request, locals, params }) => {
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (!name || name.length > 40)
			return fail(400, { rename: { name, message: 'Use 1 to 40 characters.' } });
		await renameGroup(locals, params.groupId, name);
		return { rename: { name, message: null, saved: true } };
	},

	add: async ({ request, locals, params }) => {
		const [{ household }, group, form] = await Promise.all([
			getHousehold(locals),
			getGroup(locals, params.groupId),
			request.formData()
		]);
		const memberIds = form
			.getAll('members')
			.map(String)
			.filter((id) => household.members.some((p) => p.id === id) && !group.memberIds.includes(id));
		if (memberIds.length === 0) return fail(400, { add: { message: 'Pick someone to add.' } });

		const { message } = await addGroupMembers(locals, group.id, memberIds);
		if (message) return fail(400, { add: { message } });
		return { add: { message: null, saved: true } };
	}
};
