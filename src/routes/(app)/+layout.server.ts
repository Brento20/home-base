import { getHousehold } from '#lib/features/household/household.server.js';
import { aiConfigured } from '#lib/server/ai.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { household, me } = await getHousehold(locals);
	// `ai`: whether the AI helpers show. Without a key they hide and forms work by hand.
	return { household, me, sampleMode: locals.sampleMode, ai: aiConfigured };
};
