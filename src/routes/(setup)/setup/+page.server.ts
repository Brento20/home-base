import { getAccountDetails } from '#lib/features/account/account.server.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { nickname } = await getAccountDetails(locals);
	return { nickname };
};
