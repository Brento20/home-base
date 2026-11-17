import { fail } from '@sveltejs/kit';
import { getHousehold } from '#lib/features/household/household.server.js';
import {
	HOME_NAME_MAX,
	HOME_NAME_MIN,
	HOME_PASSWORD_MIN,
	homeHasPassword,
	renameHome,
	setHomePassword
} from '#lib/features/homes/homes.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { household, me } = await getHousehold(locals);
	return {
		isOwner: household.ownerIds.includes(me.id),
		hasPassword: await homeHasPassword(locals, household.id)
	};
};

export const actions: Actions = {
	rename: async ({ request, locals }) => {
		const { household } = await getHousehold(locals);
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (name.length < HOME_NAME_MIN || name.length > HOME_NAME_MAX)
			return fail(400, {
				rename: { name, message: `Use ${HOME_NAME_MIN} to ${HOME_NAME_MAX} characters.` }
			});

		const { message } = await renameHome(locals, household.id, name);
		if (message) return fail(400, { rename: { name, message } });
		return { rename: { name, message: null, saved: true } };
	},

	password: async ({ request, locals }) => {
		const { household } = await getHousehold(locals);
		const password = String((await request.formData()).get('password') ?? '');
		if (password.length < HOME_PASSWORD_MIN)
			return fail(400, { password: { message: `Use at least ${HOME_PASSWORD_MIN} characters.` } });

		const { message } = await setHomePassword(locals, household.id, password);
		if (message) return fail(400, { password: { message } });
		return { password: { message: null, saved: true } };
	}
};
