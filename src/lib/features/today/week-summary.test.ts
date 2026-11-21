import { describe, expect, it } from 'vitest';
import { numbersCheckOut, plainSummary, weekFacts } from './week-summary.js';

const people = [
	{ id: 'b', displayName: 'Brenton' },
	{ id: 'c', displayName: 'Chris' }
] as never[];
const today = '2026-11-20';
const task = (title: string, assigneeId: string | null, dueOn: string | null) =>
	({ id: title, title, assigneeId, dueOn, recipeId: null, recipe: null }) as never;

const facts = weekFacts(
	[],
	[
		task('Clean the bathroom', 'b', today),
		task('Mop the floors', 'b', today),
		task('Vacuum', 'c', today)
	],
	new Map([['c', -59500]]),
	people,
	'b',
	today
);

describe('the line under the date', () => {
	it('names your chores and who you owe', () => {
		const line = plainSummary(facts);
		expect(line).toContain('Clean the bathroom');
		expect(line).toContain('Chris');
	});

	it('accepts an AI line whose numbers are all in the facts', () => {
		expect(numbersCheckOut('Bathroom plus 1 more. You owe Chris $595.', facts)).toBe(true);
	});

	it('throws away an AI line that makes a number up', () => {
		expect(numbersCheckOut('You owe Chris $600.', facts)).toBe(false);
		expect(numbersCheckOut('7 jobs today!', facts)).toBe(false);
	});
});
