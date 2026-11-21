import { fail, redirect } from '@sveltejs/kit';
import {
	acceptInvite,
	forgetInvite,
	previewInvite,
	rememberInvite
} from '#lib/features/homes/invites.server.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * An invite link. Open to every stage (stage.ts): it shows the home's name, then the next step
 * for where you are. The link is remembered in a cookie while you sign up and make a profile;
 * /setup sends you back here once you're ready to join.
 */
export const load: PageServerLoad = async ({ params, locals, cookies }) => {
	const invite = await previewInvite(locals, params.token);
	if (invite?.usable && locals.stage !== 'ready') rememberInvite(cookies, params.token);
	else forgetInvite(cookies);
	return { invite, stage: locals.stage };
};

export const actions: Actions = {
	accept: async ({ params, locals, cookies }) => {
		if (locals.stage !== 'home') redirect(303, `/join/${params.token}`);
		const { message } = await acceptInvite(locals, params.token);
		if (message) return fail(400, { message });
		forgetInvite(cookies);
		redirect(303, '/');
	},

	/** Build your own home instead: forget the link so /setup stops sending you here. */
	decline: async ({ cookies }) => {
		forgetInvite(cookies);
		redirect(303, '/setup');
	}
};
