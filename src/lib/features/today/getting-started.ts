/**
 * The getting-started card on Today for a new home: four first things, each ticked off by what
 * the home has actually done, not by tapping. It goes once they're all done or it's dismissed.
 */

export interface StartStep {
	id: 'invite' | 'task' | 'plan' | 'post';
	label: string;
	href: string;
	done: boolean;
}

export interface StartFacts {
	members: number;
	tasks: number;
	plans: number;
	posts: number;
}

/** Set once the card's dismissed or finished, so Today stops working it out. */
export const START_COOKIE = 'hb_started';

export function startSteps(facts: StartFacts): StartStep[] {
	return [
		{
			id: 'invite',
			label: 'Invite someone you live with',
			href: '/home/settings#invite-heading',
			done: facts.members > 1
		},
		{ id: 'task', label: 'Add a chore', href: '/lists/tasks', done: facts.tasks > 0 },
		{ id: 'plan', label: 'Plan something', href: '/plans/new', done: facts.plans > 0 },
		{ id: 'post', label: 'Say hello in the feed', href: '/feed/new', done: facts.posts > 0 }
	];
}

export const allDone = (steps: StartStep[]) => steps.every((step) => step.done);
