import { fail, redirect } from '@sveltejs/kit';
import { createNote, parseNoteForm } from '#lib/features/notes/notes.server.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { values, errors, valid } = parseNoteForm(await request.formData());
		if (!valid) return fail(400, { values, errors });

		await createNote(locals, values);
		redirect(303, '/home');
	}
};
