import { redirect } from '@sveltejs/kit';
import { deleteSettlement, getSettlement } from '#lib/features/expenses/expenses.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	return { settlement: await getSettlement(locals, params.groupId, params.settlementId) };
};

export const actions: Actions = {
	delete: async ({ locals, params }) => {
		await deleteSettlement(locals, params.groupId, params.settlementId);
		redirect(303, `/money/${params.groupId}`);
	}
};
