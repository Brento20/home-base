import { listNotes } from '#lib/features/notes/notes.server.js';
import { getScores } from '#lib/features/points/points.server.js';
import { listTasksComingUp } from '#lib/features/tasks/tasks.server.js';
import { graceFor, soonOrLater, unwrap } from '#lib/server/soon.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, isDataRequest }) => {
	// Arrives whole when it can; otherwise the phone shows its last copy (or placeholders) and
	// it fills in (src/lib/server/soon.ts, src/lib/ui/kept.svelte.ts).
	const screen = Promise.all([
		listNotes(locals),
		listTasksComingUp(locals, 7),
		getScores(locals)
	]).then(([notes, coming, scores]) => ({
		notes,
		// Chores only: dinners have their own home in Plan dinner.
		chores: coming.filter((task) => !task.recipeId),
		scores
	}));
	return { screen: unwrap(await soonOrLater(screen, graceFor('home', isDataRequest, cookies))) };
};
