import { error } from '@sveltejs/kit';

interface Problem {
	code?: string;
	message: string;
}

/**
 * What to tell someone when the database says no. Messages raised by our own database
 * functions (Postgres code P0001, "Too many tries. Wait 15 minutes…") are written for people,
 * so they pass straight through. Anything else (a broken constraint, a network blip) is logged
 * for us and replaced with a plain apology, so table and column names never reach the screen.
 */
export function friendlyMessage(problem: Problem) {
	if (problem.code === 'P0001') return problem.message;
	console.error('[database]', problem);
	return 'Something went wrong on our side. Try again in a moment.';
}

/** Stops the request with a friendly error page for a database problem. */
export function dbError(problem: Problem): never {
	error(500, friendlyMessage(problem));
}
