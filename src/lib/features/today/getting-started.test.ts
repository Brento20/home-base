import { describe, expect, it } from 'vitest';
import { allDone, startSteps } from './getting-started.js';

describe('getting started', () => {
	it('ticks steps off from what the home has done', () => {
		const steps = startSteps({ members: 1, tasks: 2, plans: 0, posts: 0 });
		expect(steps.map((step) => [step.id, step.done])).toEqual([
			['invite', false],
			['task', true],
			['plan', false],
			['post', false]
		]);
		expect(allDone(steps)).toBe(false);
	});

	it('is finished once everything is done', () => {
		expect(allDone(startSteps({ members: 2, tasks: 1, plans: 1, posts: 1 }))).toBe(true);
	});
});
