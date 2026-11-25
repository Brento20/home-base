import { describe, expect, it } from 'vitest';
import {
	ingredientKey,
	listItemKey,
	mergeDinnerIngredients,
	needAmount,
	needLine,
	startsTicked,
	type PlannedDinner
} from './dinner-shopping.js';
import type { Ingredient } from './recipe.js';

const item = (
	name: string,
	quantity: number | null,
	unit: Ingredient['unit'],
	quantityMax: number | null = null
): Ingredient => ({ name, quantity, unit, quantityMax, prepNote: null });

const dinner = (title: string, ingredients: Ingredient[]): PlannedDinner => ({
	id: title,
	title,
	dueOn: '2026-12-01',
	servings: 2,
	ingredients
});

describe('shopping for the week’s dinners', () => {
	it('treats plurals and capitals as the same thing', () => {
		expect(ingredientKey('Brown Onions')).toBe('brown onion');
		expect(ingredientKey('Tomatoes')).toBe('tomato');
		expect(ingredientKey('Cherries')).toBe('cherry');
		expect(ingredientKey('Glass')).toBe('glass');
		expect(listItemKey('Chicken thighs · 600 g')).toBe('chicken thigh');
	});

	it('adds up the same thing in the same unit, across dinners', () => {
		const [onion, rice] = mergeDinnerIngredients(
			[
				dinner('Biryani', [item('Onion', 2, 'each'), item('Rice', 300, 'g')]),
				dinner('Curry', [item('Onions', 1, 'each'), item('rice', 200, 'g')])
			],
			new Set(),
			new Set()
		);
		expect(needLine(onion)).toBe('Onion · 3');
		expect(onion.from).toEqual(['Biryani', 'Curry']);
		expect(needLine(rice)).toBe('Rice · 500 g');
	});

	it('shows both when the units differ, and keeps ranges', () => {
		const [butter, stock] = mergeDinnerIngredients(
			[
				dinner('A', [item('Butter', 50, 'g'), item('Stock', 250, 'ml', 300)]),
				dinner('B', [item('Butter', 2, 'tbsp'), item('Stock', 250, 'ml')])
			],
			new Set(),
			new Set()
		);
		expect(needAmount(butter)).toBe('50 g + 2 tbsp');
		expect(needAmount(stock)).toBe('500–550 ml');
	});

	it('starts "to taste", pantry and already-listed things unticked', () => {
		const needs = mergeDinnerIngredients(
			[
				dinner('A', [
					item('Salt', null, null),
					item('Olive oil', 2, 'tbsp'),
					item('Lemon', 1, 'each')
				])
			],
			new Set(['olive oil']),
			new Set(['lemon'])
		);
		expect(needs.map((need) => [need.key, startsTicked(need)])).toEqual([
			['salt', false],
			['olive oil', false],
			['lemon', false]
		]);
		expect(needLine(needs[0])).toBe('Salt');
	});
});
