import type { PageServerLoad } from './$types';

/** Where the back link goes: Home for someone with a home, otherwise wherever they came from. */
export const load: PageServerLoad = ({ locals }) => ({ stage: locals.stage });
