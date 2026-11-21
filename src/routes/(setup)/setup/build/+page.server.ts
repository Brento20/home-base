import { fail, redirect } from '@sveltejs/kit';
import { createHome, parseHomeForm } from '#lib/features/homes/homes.server.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { name, errors, valid } = parseHomeForm(await request.formData());
		if (!valid) return fail(400, { name, errors, message: null });

		const { message } = await createHome(locals, name);
		if (message) return fail(400, { name, errors: {}, message });

		redirect(303, '/');
	}
};
