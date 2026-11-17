import { getScores } from '#lib/features/points/points.server.js';
import { listPastTasks } from '#lib/features/tasks/tasks.server.js';
import { todayISO } from '#lib/time.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [scores, recent] = await Promise.all([getScores(locals), listPastTasks(locals, 12)]);
	return { scores, recent, today: todayISO() };
};
