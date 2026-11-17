import { listNotes } from '#lib/features/notes/notes.server.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { notes: await listNotes(locals) };
};
