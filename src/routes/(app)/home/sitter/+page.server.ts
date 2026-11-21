import { fail } from '@sveltejs/kit';
import { listNotes } from '#lib/features/notes/notes.server.js';
import { sitterLink } from '#lib/features/sitter/sitter.js';
import {
	createSitterLink,
	listSitterLinks,
	parseSitterForm,
	revokeSitterLink
} from '#lib/features/sitter/sitter.server.js';
import { addDays, todayISO } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [notes, links] = await Promise.all([listNotes(locals), listSitterLinks(locals)]);
	const today = todayISO();
	return {
		// Titles only: the bodies (secret ones included) stay off this page.
		notes: notes.map(({ id, title, isSecret }) => ({ id, title, isSecret })),
		links,
		today,
		suggestedLastDay: addDays(today, 7)
	};
};

export const actions: Actions = {
	/** A new link. Its token is shown once, here; the database keeps only a hash. */
	create: async ({ request, locals, url }) => {
		const { values, problem } = parseSitterForm(await request.formData());
		if (problem) return fail(400, { create: { values, message: problem, link: null } });
		const { token, message } = await createSitterLink(locals, values);
		if (!token) return fail(400, { create: { values, message, link: null } });
		return { create: { values, message: null, link: sitterLink(url.origin, token) } };
	},

	revoke: async ({ request, locals }) => {
		const { message } = await revokeSitterLink(
			locals,
			String((await request.formData()).get('id') ?? '')
		);
		if (message) return fail(400, { revoke: { message } });
	}
};
