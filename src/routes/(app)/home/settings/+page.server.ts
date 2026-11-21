import { fail, redirect } from '@sveltejs/kit';
import { getHousehold } from '#lib/features/household/household.server.js';
import {
	HOME_NAME_MAX,
	HOME_NAME_MIN,
	leaveHome,
	renameHome,
	setHomePlace
} from '#lib/features/homes/homes.server.js';
import { inviteLink } from '#lib/features/homes/invites.js';
import { createInvite, listInvites, revokeInvite } from '#lib/features/homes/invites.server.js';
import { CURRENCIES, timeZones } from '#lib/home.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { household, me } = await getHousehold(locals);
	const isOwner = household.ownerIds.includes(me.id);
	return {
		isOwner,
		invites: isOwner ? await listInvites(locals, household.id) : [],
		timeZones: timeZones(),
		currencies: CURRENCIES.map((currency) => ({ ...currency }))
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

	/** Time zone and currency. A full reload follows, so every date and amount redraws. */
	place: async ({ request, locals }) => {
		const { household, me } = await getHousehold(locals);
		if (!household.ownerIds.includes(me.id))
			return fail(403, { place: { message: 'Only the home’s owner can change this.' } });
		const form = await request.formData();
		const place = {
			timeZone: String(form.get('timeZone') ?? ''),
			currency: String(form.get('currency') ?? '')
		};
		const { message } = await setHomePlace(locals, household.id, place);
		if (message) return fail(400, { place: { message } });
		return { place: { message: null, saved: true } };
	},

	/** A new invite link. Its token is shown once, here; the database keeps only a hash. */
	invite: async ({ request, locals, url }) => {
		const { household, me } = await getHousehold(locals);
		if (!household.ownerIds.includes(me.id))
			return fail(403, {
				invite: { link: null, message: 'Only the home’s owner can invite people.' }
			});
		const uses = Number((await request.formData()).get('uses'));
		const { token, message } = await createInvite(locals, household.id, uses);
		if (!token) return fail(400, { invite: { link: null, message } });
		return { invite: { link: inviteLink(url.origin, token), message: null } };
	},

	revoke: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id') ?? '');
		const { message } = await revokeInvite(locals, id);
		if (message) return fail(400, { revoke: { message } });
		return { revoke: { message: null } };
	},

	leave: async ({ locals }) => {
		const { message } = await leaveHome(locals);
		if (message) return fail(400, { leave: { message } });
		redirect(303, '/setup');
	}
};
