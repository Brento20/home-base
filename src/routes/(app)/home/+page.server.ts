import { listNotes } from '#lib/features/notes/notes.server.js';
import { getScores } from '#lib/features/points/points.server.js';
import { listTasksComingUp } from '#lib/features/tasks/tasks.server.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [notes, coming, scores] = await Promise.all([
		listNotes(locals),
		listTasksComingUp(locals, 7),
		getScores(locals)
	]);
	// Chores only: dinners have their own home in Plan dinner.
	return { notes, chores: coming.filter((task) => !task.recipeId), scores };
};
