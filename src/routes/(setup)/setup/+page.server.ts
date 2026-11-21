import { redirect } from '@sveltejs/kit';
import { getAccountDetails } from '#lib/features/account/account.server.js';
import { savedInvite } from '#lib/features/homes/invites.server.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	// Came in on an invite link: back to it, now that you can join. The link page forgets it
	// if it's run out, or if you'd rather build your own home.
	const invite = savedInvite(cookies);
	if (invite) redirect(303, `/join/${invite}`);

	const { nickname } = await getAccountDetails(locals);
	return { nickname };
};
