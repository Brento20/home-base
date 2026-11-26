import { describe, expect, it } from 'vitest';
import { guessCategory } from './categories.js';

describe('guessCategory', () => {
	it.each([
		['Groceries', 'groceries'],
		['Woolies run', 'groceries'],
		['Coles', 'groceries'],
		['Dumplings in Haymarket', 'eating_out'],
		['Uber Eats', 'eating_out'],
		['Uber home', 'transport'],
		['Opal top up', 'transport'],
		['Electricity bill', 'utilities'],
		['Gas bill', 'utilities'],
		['NBN', 'internet'],
		['Concert tickets', 'events'],
		['Chris’s birthday present', 'events'],
		['Bunnings', 'household'],
		['Cleaning supplies', 'household'],
		['Rent', 'rent']
	])('%s → %s', (text, key) => {
		expect(guessCategory(text)).toBe(key);
	});

	it('matches words, not parts of words', () => {
		expect(guessCategory('Vegas trip')).toBeNull();
		expect(guessCategory('Parent teacher night')).toBeNull();
		expect(guessCategory('Barista course')).toBeNull();
	});

	it('gives up on nothing, or nothing it knows', () => {
		expect(guessCategory('')).toBeNull();
		expect(guessCategory('Thing for Sam')).toBeNull();
	});
});
