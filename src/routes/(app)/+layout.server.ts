import { getHousehold } from '#lib/features/household/household.server.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { household, me } = await getHousehold(locals);
	return { household, me, sampleMode: locals.sampleMode };
};
