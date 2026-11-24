import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Public profile is part of Edit profile now. Old links still land in the right place. */
export const load: PageServerLoad = () => redirect(308, '/profile/edit');
