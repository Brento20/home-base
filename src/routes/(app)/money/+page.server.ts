import { listGroups } from '#lib/features/expenses/expenses.server.js';
import { graceFor, soonOrLater, unwrap } from '#lib/server/soon.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, isDataRequest }) => {
	// Arrives whole when it can; otherwise the phone shows its last copy (or placeholders) and
	// it fills in (src/lib/server/soon.ts, src/lib/ui/kept.svelte.ts).
	const screen = listGroups(locals).then((groups) => ({ groups }));
	return { screen: unwrap(await soonOrLater(screen, graceFor('money', isDataRequest, cookies))) };
};
