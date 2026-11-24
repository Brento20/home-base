import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Edit your profile moved: names, pronouns and birthday are under Details and account; photo, nickname and colour under Edit profile. Old links still land in the right place. */
export const load: PageServerLoad = () => redirect(308, '/profile/details');
