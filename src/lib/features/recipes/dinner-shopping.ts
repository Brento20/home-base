/**
 * Shopping for the week's dinners: every planned dinner's ingredients (already scaled to its
 * servings) merged into one list. The same thing in the same unit adds up ("2 onions" and
 * "1 onion" is "3 onions"); in different units it reads as both ("Butter · 50 g + 2 tbsp"),
 * because a tablespoon of butter isn't a number of grams we can know. "To taste" things and
 * whatever the home keeps in the pantry start unticked; anything already waiting on the
 * Shopping list is noted, so nothing goes on twice. Pure, shared by the screen and the server.
 */
import { formatQuantity, type Ingredient, type Unit } from './recipe.js';

export interface PlannedDinner {
	/** The dinner's task id. */
	id: string;
	title: string;
	dueOn: string;
	servings: number;
	ingredients: Ingredient[];
}

export interface ShoppingNeed {
	/** What merges: the name lowercased and singular ("Brown onions" → "brown onion"). */
	key: string;
	/** As the first recipe wrote it. */
	name: string;
	/** Amounts by unit, summed ("each" for counts); empty when every recipe said "to taste". */
	amounts: { unit: Unit | 'each'; quantity: number; quantityMax: number | null }[];
	/** The dinners that need it, by title. */
	from: string[];
	/** "To taste" only, or kept in the pantry: starts unticked. */
	pantry: boolean;
	/** Already on the Shopping list, unticked: starts unticked too. */
	onList: boolean;
}

/** "Brown Onions" → "brown onion", "Tomatoes" → "tomato", "Cherries" → "cherry". */
export function ingredientKey(name: string): string {
	const words = name
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, ' ')
		.split(/\s+/)
		.filter(Boolean);
	const last = words.pop() ?? '';
	const singular = last.endsWith('ies')
		? `${last.slice(0, -3)}y`
		: /(oes|ches|shes|sses|xes)$/.test(last)
			? last.slice(0, -2)
			: last.endsWith('s') && !last.endsWith('ss') && last.length > 3
				? last.slice(0, -1)
				: last;
	return [...words, singular].join(' ');
}

/** A Shopping list line's key: the part before " · " ("Chicken thigh · 600 g"). */
export const listItemKey = (line: string) => ingredientKey(line.split(' · ')[0]);

/** Merges the chosen dinners' ingredients, in the order they first appear. */
export function mergeDinnerIngredients(
	dinners: PlannedDinner[],
	pantry: ReadonlySet<string>,
	onList: ReadonlySet<string>
): ShoppingNeed[] {
	const needs = new Map<string, ShoppingNeed>();
	for (const dinner of dinners) {
		for (const ingredient of dinner.ingredients) {
			const key = ingredientKey(ingredient.name);
			if (!key) continue;
			let need = needs.get(key);
			if (!need) {
				need = { key, name: ingredient.name, amounts: [], from: [], pantry: false, onList: false };
				needs.set(key, need);
			}
			if (!need.from.includes(dinner.title)) need.from.push(dinner.title);
			if (ingredient.quantity === null || ingredient.quantity <= 0) continue;
			const unit = ingredient.unit ?? 'each';
			const high = ingredient.quantityMax && ingredient.quantityMax > ingredient.quantity;
			const amount = need.amounts.find((entry) => entry.unit === unit);
			if (amount) {
				// A range anywhere keeps a range: its low ends add up, and so do its high ends.
				if (high || amount.quantityMax !== null)
					amount.quantityMax =
						(amount.quantityMax ?? amount.quantity) +
						(high ? ingredient.quantityMax! : ingredient.quantity);
				amount.quantity += ingredient.quantity;
			} else {
				need.amounts.push({
					unit,
					quantity: ingredient.quantity,
					quantityMax: high ? ingredient.quantityMax! : null
				});
			}
		}
	}
	return [...needs.values()].map((need) => ({
		...need,
		pantry: need.amounts.length === 0 || pantry.has(need.key),
		onList: onList.has(need.key)
	}));
}

/** "3", "650 g", "50 g + 2 tbsp", or "" for "to taste". */
export function needAmount(need: ShoppingNeed): string {
	return need.amounts
		.map((amount) =>
			formatQuantity(
				amount.quantity,
				amount.unit === 'each' ? 'each' : amount.unit,
				amount.quantityMax
			)
		)
		.filter(Boolean)
		.join(' + ');
}

/** The Shopping list line: "Brown onion · 3", or just "Salt". Fits a list item (120). */
export function needLine(need: ShoppingNeed): string {
	const amount = needAmount(need);
	return (amount ? `${need.name} · ${amount}` : need.name).slice(0, 120);
}

/** Whether a need starts ticked: not in the pantry and not already on the list. */
export const startsTicked = (need: ShoppingNeed) => !need.pantry && !need.onList;
