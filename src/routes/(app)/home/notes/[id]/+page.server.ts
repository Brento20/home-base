import { fail, redirect } from '@sveltejs/kit';
import {
	deleteNote,
	getNote,
	parseNoteForm,
	updateNote
} from '#lib/features/notes/notes.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	return { note: await getNote(locals, params.id) };
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const { values, errors, valid } = parseNoteForm(await request.formData());
		if (!valid) return fail(400, { values, errors });

		await updateNote(locals, params.id, values);
		redirect(303, '/home');
	},

	delete: async ({ locals, params }) => {
		await deleteNote(locals, params.id);
		redirect(303, '/home');
	}
};
