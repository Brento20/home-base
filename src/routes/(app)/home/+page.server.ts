import { fail } from '@sveltejs/kit';
import { answerRequest } from '#lib/features/friends/requests.server.js';
import { listNotes } from '#lib/features/notes/notes.server.js';
import {
	forgetFriendRequest,
	listNotifications
} from '#lib/features/notifications/notifications.server.js';
import { getScores } from '#lib/features/points/points.server.js';
import { listTasksComingUp } from '#lib/features/tasks/tasks.server.js';
import { graceFor, soonOrLater, unwrap } from '#lib/server/soon.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, isDataRequest }) => {
	// Arrives whole when it can; otherwise the phone shows its last copy (or placeholders) and
	// it fills in (src/lib/server/soon.ts, src/lib/ui/kept.svelte.ts).
	const screen = Promise.all([
		listNotes(locals),
		listTasksComingUp(locals, 7),
		getScores(locals),
		listNotifications(locals, 6)
	]).then(([notes, coming, scores, notifications]) => ({
		notes,
		// The newest few for the notification centre at the top; the rest are on /notifications.
		notifications,
		// Chores only: dinners have their own home in Plan dinner.
		chores: coming.filter((task) => !task.recipeId),
		scores
	}));
	return { screen: unwrap(await soonOrLater(screen, graceFor('home', isDataRequest, cookies))) };
};

export const actions: Actions = {
	/** Yes or no to a friend request, right from its notification. */
	answer: async ({ request, locals }) => {
		const form = await request.formData();
		const person = String(form.get('person') ?? '');
		const { message } = await answerRequest(locals, person, form.get('accept') === 'yes');
		if (message) return fail(400, { answer: { message } });
		forgetFriendRequest(locals, person);
	}
};
