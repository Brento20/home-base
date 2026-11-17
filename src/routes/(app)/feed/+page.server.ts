import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The feed lives on Today; this address just takes you there.
export const load: PageServerLoad = () => redirect(307, '/');
