import { describe, expect, it } from 'vitest';
import {
	describeIngredient,
	formatQuantity,
	ingredientLine,
	parseIngredientLine,
	scaleIngredients
} from './recipe.js';

describe('parseIngredientLine', () => {
	it('reads an amount, unit, name and prep note', () => {
		expect(parseIngredientLine('200 g chicken thigh, sliced')).toEqual({
			name: 'Chicken thigh',
			quantity: 200,
			quantityMax: null,
			unit: 'g',
			prepNote: 'sliced'
		});
	});

	it('reads ranges however they are typed (the "80 -100g" import bug)', () => {
		for (const line of [
			'80-100 g noodles',
			'80 -100g noodles',
			'80–100 g noodles',
			'80 to 100 g noodles'
		]) {
			const ingredient = parseIngredientLine(line)!;
			expect([ingredient.quantity, ingredient.quantityMax, ingredient.unit]).toEqual([
				80,
				100,
				'g'
			]);
		}
	});

	it('never reads a stray dash as a negative amount', () => {
		const ingredient = parseIngredientLine('-100g noodles')!;
		expect(ingredient.quantity).toBe(100);
	});

	it('turns kg and litres into grams and millilitres', () => {
		expect(parseIngredientLine('1.25 kg chicken wings')!.quantity).toBe(1250);
		expect(parseIngredientLine('1 L stock')!.unit).toBe('ml');
	});

	it('reads glyphs, fractions, unit words and thousands', () => {
		expect(parseIngredientLine('1 ½ cups rice')!.quantity).toBe(1.5);
		expect(parseIngredientLine('3 tablespoons olive oil')!.unit).toBe('tbsp');
		expect(parseIngredientLine('1,250 g chicken wings')!.quantity).toBe(1250);
	});

	it('reads "2 × 400 g tins" as two of a counted thing', () => {
		const ingredient = parseIngredientLine('2 x 400 g tins diced tomatoes')!;
		expect([ingredient.quantity, ingredient.unit]).toEqual([2, 'each']);
		expect(ingredient.name).toMatch(/^400 g tins/);
	});

	it('leaves "to taste" without an amount', () => {
		const ingredient = parseIngredientLine('Salt and pepper, to taste')!;
		expect(ingredient.quantity).toBeNull();
		expect(describeIngredient(ingredient).amount).toBe('To taste');
	});

	it('round-trips every line through ingredientLine unchanged', () => {
		for (const line of [
			'80-100 g noodles, soaked',
			'2 to 3 garlic cloves, crushed',
			'½-1 tsp chilli flakes',
			'2 × 400g tins diced tomatoes',
			'1,250 g chicken wings',
			'400ml coconut milk',
			'2 large eggs'
		]) {
			const once = parseIngredientLine(line)!;
			expect(parseIngredientLine(ingredientLine(once))).toEqual(once);
		}
	});
});

describe('formatQuantity', () => {
	it('shows a range with the unit once', () => {
		expect(formatQuantity(80, 'g', 100)).toBe('80–100 g');
		expect(formatQuantity(1, 'cup', 2)).toBe('1–2 cups');
	});

	it('shows nothing for no amount', () => {
		expect(formatQuantity(null, 'g')).toBeNull();
	});
});

describe('scaleIngredients', () => {
	it('scales both ends of a range with the servings', () => {
		const recipe = { baseServings: 2, ingredients: [parseIngredientLine('80-100 g noodles')!] };
		const doubled = scaleIngredients(recipe as never, 4)[0];
		expect([doubled.quantity, doubled.quantityMax]).toEqual([160, 200]);
	});
});
