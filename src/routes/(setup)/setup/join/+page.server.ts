import { fail, redirect } from '@sveltejs/kit';
import { joinHome, parseHomeForm } from '#lib/features/homes/homes.server.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { name, password, errors, valid } = parseHomeForm(await request.formData(), {
			checkStrength: false
		});
		if (!valid) return fail(400, { name, errors, message: null });

		const { message } = await joinHome(locals, name, password);
		if (message) return fail(400, { name, errors: {}, message });

		redirect(303, '/');
	}
};
