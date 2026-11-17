import { getGroup } from '#lib/features/expenses/expenses.server.js';
import type { LayoutServerLoad } from './$types';

/** Every page inside a group needs the group and its people; a 404 if you're not in it. */
export const load: LayoutServerLoad = async ({ locals, params, parent }) => {
	const [group, { household }] = await Promise.all([getGroup(locals, params.groupId), parent()]);
	const people = group.memberIds
		.map((id) => household.members.find((person) => person.id === id))
		.filter((person) => person !== undefined);
	return { group, people };
};
