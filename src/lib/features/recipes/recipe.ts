/**
 * Recipes: the shape, scaling to a number of servings, how quantities read, and search.
 * Pure and shared by the server and the screens.
 *
 * Every recipe's ingredient amounts are for `baseServings`. Choosing servings scales every
 * amount by servings / baseServings; the method never names an amount ("add half the stock"),
 * so it reads right at any count.
 */

export type Unit = 'g' | 'ml' | 'tsp' | 'tbsp' | 'cup' | 'each';

export interface Ingredient {
	name: string;
	/** Null for "to taste" and the like. The low end of a range ("80–100 g" is 80). */
	quantity: number | null;
	/** The high end of a range ("80–100 g" is 100); missing or null when it's one amount. */
	quantityMax?: number | null;
	/** Null when there's no quantity; 'each' for things you count (2 eggs). */
	unit: Unit | null;
	prepNote: string | null;
}

export interface Nutrition {
	energyKj: number;
	proteinG: number;
	/** The rest can be missing for a home recipe. */
	fatG: number | null;
	carbsG: number | null;
	sugarsG: number | null;
	fibreG: number | null;
	/** A home recipe's "About these numbers": where an import got them (which were estimated). */
	note?: string | null;
}

export interface Recipe {
	/** recipe_001… for the built-in library, a uuid for recipes added at home. */
	id: string;
	title: string;
	baseServings: number;
	prepMinutes: number;
	cookMinutes: number;
	restMinutes: number;
	totalMinutes: number;
	tags: string[];
	cuisine: string | null;
	isVegetarian: boolean;
	isVegan: boolean;
	proteins: string[];
	ingredients: Ingredient[];
	steps: string[];
	/** Per serving; estimated for the library. Null when a home recipe doesn't give it. */
	nutrition: Nutrition | null;
	nutritionNote: string | null;
	/** Swaps and notes, like "Use vegan vegetable stock." */
	tips: string[];
	/** True for recipes added at home (they can be edited and deleted). */
	custom: boolean;
}

/** What the library list needs, plus the words search looks through. */
export interface RecipeSummary {
	id: string;
	title: string;
	totalMinutes: number;
	isVegetarian: boolean;
	isVegan: boolean;
	cuisine: string | null;
	proteins: string[];
	energyKj: number | null;
	proteinG: number | null;
	/** Lowercased title, ingredient names, cuisine and tags, for search. */
	searchText: string;
	custom: boolean;
	/** The home's photo of it (recipe-photos.server.ts), or null. */
	photoUrl: string | null;
}

/** A dinner task's copy of the recipe as scheduled: amounts already scaled to `servings`. */
export interface DinnerSnapshot {
	title: string;
	servings: number;
	ingredients: Ingredient[];
	steps: string[];
}

export const SERVINGS_MIN = 1;
export const SERVINGS_MAX = 12;
export const DEFAULT_SERVINGS = 2;

export const QUICK_MINUTES = 30;

export const NUTRITION_CREDIT =
	'Estimated per serve from Food Standards Australia New Zealand (FSANZ) reference data. A guide, not a label: brands and portions vary.';

export function clampServings(value: number) {
	if (!Number.isFinite(value)) return DEFAULT_SERVINGS;
	return Math.min(SERVINGS_MAX, Math.max(SERVINGS_MIN, Math.round(value)));
}

/** The recipe's ingredients for this many servings. */
export function scaleIngredients(
	recipe: Pick<Recipe, 'ingredients' | 'baseServings'>,
	servings: number
) {
	const factor = servings / recipe.baseServings;
	return recipe.ingredients.map((ingredient) => ({
		...ingredient,
		quantity: ingredient.quantity === null ? null : ingredient.quantity * factor,
		quantityMax: ingredient.quantityMax ? ingredient.quantityMax * factor : null
	}));
}

const FRACTIONS: [number, string][] = [
	[0.25, '¼'],
	[1 / 3, '⅓'],
	[0.5, '½'],
	[2 / 3, '⅔'],
	[0.75, '¾']
];

/** 1.5 → "1½", 0.25 → "¼", 2 → "2". Rounded to the nearest quarter or third, never to 0. */
export function formatCount(value: number) {
	const whole = Math.floor(value + 1e-9);
	const rest = value - whole;
	let best: [number, string] = [0, ''];
	let bestGap = rest;
	for (const fraction of FRACTIONS) {
		const gap = Math.abs(rest - fraction[0]);
		if (gap < bestGap) [best, bestGap] = [fraction, gap];
	}
	if (Math.abs(1 - rest) < bestGap) return String(whole + 1);
	if (whole === 0 && !best[1]) return '¼';
	return `${whole || ''}${best[1]}` || '0';
}

/** Grams and millilitres round to amounts you can measure; big ones become kg and L. */
function formatMetric(value: number, unit: 'g' | 'ml') {
	const big = unit === 'g' ? 'kg' : 'L';
	if (value >= 1000) return `${trim(value / 1000, 2)} ${big}`;
	const step = value < 10 ? 0.5 : value < 100 ? 1 : 5;
	return `${trim(Math.max(step, Math.round(value / step) * step), 1)} ${unit}`;
}

const trim = (value: number, places: number) =>
	Number(value.toFixed(places)).toLocaleString('en-AU', { maximumFractionDigits: places });

/**
 * "150 g", "1½ tsp", "2" (for 'each'), a range like "80–100 g" or "2–3 tbsp", or null for
 * "to taste".
 */
export function formatQuantity(
	quantity: number | null,
	unit: Unit | null,
	max?: number | null
): string | null {
	if (quantity === null || quantity <= 0) return null;
	if (max && max > quantity) {
		const low = formatQuantity(quantity, unit);
		const high = formatQuantity(max, unit);
		if (low && high && low !== high) {
			// "80 g" and "100 g" → "80–100 g": the unit once, at the end. 1 kg–1.5 kg stays whole.
			const [lowNumber, lowUnit] = splitUnit(low);
			const [, highUnit] = splitUnit(high);
			return lowUnit === highUnit ? `${lowNumber}–${high}` : `${low}–${high}`;
		}
		return low;
	}
	switch (unit) {
		case 'g':
		case 'ml':
			return formatMetric(quantity, unit);
		case 'tsp':
		case 'tbsp':
			return `${formatCount(quantity)} ${unit}`;
		case 'cup':
			return `${formatCount(quantity)} ${quantity > 1 ? 'cups' : 'cup'}`;
		default:
			return formatCount(quantity);
	}
}

/** "80–100 g" → ["80–100", "g"]; "2" → ["2", ""]. cup and cups count as the same unit. */
function splitUnit(amount: string): [string, string] {
	const space = amount.indexOf(' ');
	if (space < 0) return [amount, ''];
	return [amount.slice(0, space), amount.slice(space + 1).replace(/^cups$/, 'cup')];
}

/** The ingredient's amount as it reads, ranges included. */
const amountOf = (ingredient: Ingredient) =>
	formatQuantity(ingredient.quantity, ingredient.unit, ingredient.quantityMax);

/** How an ingredient reads in a recipe: the amount, then the name, then how to prep it. */
export function describeIngredient(ingredient: Ingredient) {
	const amount = amountOf(ingredient);
	return {
		amount: amount ?? (ingredient.prepNote?.startsWith('to taste') ? 'To taste' : ''),
		name: ingredient.name,
		note:
			amount === null && ingredient.prepNote?.startsWith('to taste') ? null : ingredient.prepNote
	};
}

/** A shopping list line: "Chicken thigh · 600 g", or just "Salt". Fits a list item (120). */
export function shoppingLine(ingredient: Ingredient) {
	const amount = amountOf(ingredient);
	return (amount ? `${ingredient.name} · ${amount}` : ingredient.name).slice(0, 120);
}

/** Things you'll almost always have, so the shopping list starts with them unticked. */
export function isPantryStaple(ingredient: Ingredient) {
	return ingredient.quantity === null;
}

export function formatMinutes(minutes: number) {
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** "Italian-inspired" → "Italian". */
export function cuisineLabel(cuisine: string | null) {
	return cuisine ? cuisine.replace(/-inspired$/i, '').trim() : null;
}

const PROTEIN_LABELS: Record<string, string> = {
	chicken: 'Chicken',
	beef: 'Beef',
	pork: 'Pork',
	turkey: 'Turkey',
	fish: 'Fish',
	shellfish: 'Seafood',
	egg: 'Eggs',
	tofu: 'Tofu',
	legumes: 'Legumes',
	dairy: 'Dairy',
	nuts: 'Nuts'
};

export const proteinLabel = (protein: string) =>
	PROTEIN_LABELS[protein] ?? protein.charAt(0).toUpperCase() + protein.slice(1);

// Words that keep their capital mid-sentence ("Cook Thai green curry").
const PROPER =
	/^(thai|italian|indian|japanese|chinese|korean|mexican|moroccan|greek|french|spanish|british|sri|lebanese|vietnamese|tuscan|mediterranean|cajun|bolognese|caesar|tex-mex|sichuan|szechuan|hokkien|singapore|malaysian|persian|turkish|cuban|creole|jamaican|aussie|australian|christmas|anzac)\b/i;

/** The title as it reads inside a sentence: "Chicken biryani" → "chicken biryani". */
export function inSentence(title: string) {
	return PROPER.test(title) ? title : title.charAt(0).toLowerCase() + title.slice(1);
}

export const cookTitle = (title: string) => `Cook ${inSentence(title)}`.slice(0, 160);

export function summarise(recipe: Recipe, photoUrl: string | null = null): RecipeSummary {
	return {
		id: recipe.id,
		title: recipe.title,
		totalMinutes: recipe.totalMinutes,
		isVegetarian: recipe.isVegetarian,
		isVegan: recipe.isVegan,
		cuisine: cuisineLabel(recipe.cuisine),
		proteins: recipe.proteins,
		energyKj: recipe.nutrition?.energyKj ?? null,
		proteinG: recipe.nutrition?.proteinG ?? null,
		searchText: [
			recipe.title,
			...recipe.ingredients.map((ingredient) => ingredient.name),
			recipe.cuisine ?? '',
			...recipe.tags
		]
			.join(' ')
			.toLowerCase(),
		custom: recipe.custom,
		photoUrl
	};
}

export interface RecipeFilters {
	query: string;
	quick: boolean;
	vegetarian: boolean;
	vegan: boolean;
	favourites: boolean;
	cuisine: string | null;
	protein: string | null;
}

export const NO_FILTERS: RecipeFilters = {
	query: '',
	quick: false,
	vegetarian: false,
	vegan: false,
	favourites: false,
	cuisine: null,
	protein: null
};

/** A 5-star rating makes a favourite. */
export const FAVOURITE_STARS = 5;

/** When a dinner is due. With no time, it's treated as a 7pm dinner. */
export const DEFAULT_DINNER_TIME = '19:00';

/**
 * Recipes matching every filter. Search matches every word of the query against the title,
 * ingredients, cuisine and tags, so "chicken" finds Chicken biryani and anything cooked with
 * chicken thigh, and "chicken rice" narrows to both.
 */
export function filterRecipes(
	recipes: RecipeSummary[],
	filters: RecipeFilters,
	myStars: Record<string, number>
) {
	const words = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
	return recipes.filter(
		(recipe) =>
			words.every((word) => recipe.searchText.includes(word)) &&
			(!filters.quick || recipe.totalMinutes <= QUICK_MINUTES) &&
			(!filters.vegetarian || recipe.isVegetarian) &&
			(!filters.vegan || recipe.isVegan) &&
			(!filters.favourites || (myStars[recipe.id] ?? 0) >= FAVOURITE_STARS) &&
			(!filters.cuisine || recipe.cuisine === filters.cuisine) &&
			(!filters.protein || recipe.proteins.includes(filters.protein))
	);
}

/** The cuisines and proteins that actually appear, most common first, for More filters. */
export function filterOptions(recipes: RecipeSummary[]) {
	const count = (values: string[]) => {
		const tally = new Map<string, number>();
		for (const value of values) tally.set(value, (tally.get(value) ?? 0) + 1);
		return [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([v]) => v);
	};
	return {
		cuisines: count(recipes.flatMap((recipe) => (recipe.cuisine ? [recipe.cuisine] : []))),
		proteins: count(recipes.flatMap((recipe) => recipe.proteins)).filter(
			(protein) => protein in PROTEIN_LABELS
		)
	};
}

/** One amount: 2, 1.5, 1,5, ½, 1/2, 1 ½ or 1½. */
const AMOUNT = String.raw`(?:\d+\/\d+|\d+(?:[.,]\d+)?(?:\s*(?:\d+\/\d+|[¼½¾⅓⅔]))?|[¼½¾⅓⅔])`;
const INGREDIENT_LINE = new RegExp(
	String.raw`^(${AMOUNT})` +
		// A range: "80-100", "80 - 100", "80–100", "2 to 3", "1 or 2".
		String.raw`(?:\s*(?:-|–|—|to|or)\s*(${AMOUNT}))?` +
		String.raw`\s*(kg|g|grams?|ml|millilitres?|l|litres?|tsp|teaspoons?|tbsp|tablespoons?|cups?)?\b\.?` +
		// "2 x 400 g tins": two of the thing that follows.
		String.raw`(\s*[x×]\s*(?=\d))?` +
		String.raw`\s*(.*)$`,
	'i'
);

const UNIT_WORDS: Record<string, Unit | 'kg' | 'l'> = {
	g: 'g',
	gram: 'g',
	grams: 'g',
	kg: 'kg',
	ml: 'ml',
	millilitre: 'ml',
	millilitres: 'ml',
	l: 'l',
	litre: 'l',
	litres: 'l',
	tsp: 'tsp',
	teaspoon: 'tsp',
	teaspoons: 'tsp',
	tbsp: 'tbsp',
	tablespoon: 'tbsp',
	tablespoons: 'tbsp',
	cup: 'cup',
	cups: 'cup'
};

/**
 * Reads "200 g chicken thigh, sliced" into an ingredient: an optional amount (2, 1.5, ½, 1/2,
 * 1 ½) or range ("80–100 g", "2 to 3"), an optional unit (g, kg, ml, L, tsp, tbsp, cup, or the
 * words), the name, and anything after the first comma as the prep note. kg and L become g and
 * ml. "2 x 400 g tins tomatoes" is two "400 g tins tomatoes".
 */
export function parseIngredientLine(line: string): Ingredient | null {
	// A bullet, or a stray dash from a broken range ("-100g"): amounts are never negative.
	const text = line.trim().replace(/^[-–•*]\s*/, '');
	if (!text) return null;
	const match = text.match(INGREDIENT_LINE);
	let quantity: number | null = null;
	let quantityMax: number | null = null;
	let unit: Unit | null = null;
	let rest = text;
	if (match) {
		quantity = parseAmount(match[1]);
		quantityMax = match[2] ? parseAmount(match[2]) : null;
		const rawUnit = match[3] ? UNIT_WORDS[match[3].toLowerCase()] : undefined;
		rest = match[5];
		const scale = rawUnit === 'kg' || rawUnit === 'l' ? 1000 : 1;
		quantity *= scale;
		if (quantityMax !== null) quantityMax *= scale;
		unit =
			rawUnit === 'kg' ? 'g' : rawUnit === 'l' ? 'ml' : rawUnit && !match[4] ? rawUnit : 'each';
		rest = rest.replace(/^of\s+/i, '');
	}
	const comma = rest.indexOf(',');
	const name = (comma >= 0 ? rest.slice(0, comma) : rest).trim();
	const prepNote = comma >= 0 ? rest.slice(comma + 1).trim() || null : null;
	if (!name) return null;
	const hasAmount = quantity !== null && quantity > 0;
	return {
		name: name.charAt(0).toUpperCase() + name.slice(1),
		quantity: hasAmount ? quantity : null,
		quantityMax: hasAmount && quantityMax !== null && quantityMax > quantity! ? quantityMax : null,
		unit: hasAmount ? unit : null,
		prepNote
	};
}

const GLYPHS: Record<string, number> = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

function parseAmount(text: string) {
	// "1,250" is twelve hundred and fifty; "1,5" is one and a half.
	if (/^\d{1,3}(,\d{3})+$/.test(text.trim())) return Number(text.replace(/,/g, ''));
	let total = 0;
	for (const part of text.trim().split(/\s+|(?=[¼½¾⅓⅔])/)) {
		if (!part) continue;
		if (part in GLYPHS) total += GLYPHS[part];
		else if (part.includes('/')) {
			const [top, bottom] = part.split('/').map(Number);
			if (bottom) total += top / bottom;
		} else total += Number(part.replace(',', '.')) || 0;
	}
	return total;
}

/** An ingredient back as a line of text, for editing a home recipe: "80-100 g noodles". */
export function ingredientLine(ingredient: Ingredient) {
	let amount = '';
	if (ingredient.quantity !== null) {
		// Plain numbers, no thousands comma: "1,250" would read back as 1.25.
		const plain = (value: number) => String(Number(value.toFixed(2)));
		const number = ingredient.quantityMax
			? `${plain(ingredient.quantity)}-${plain(ingredient.quantityMax)}`
			: plain(ingredient.quantity);
		const counted = ingredient.unit === 'each' || ingredient.unit === null;
		// "2 × 400 g tins tomatoes", so the 400 isn't read as part of the amount.
		amount = counted
			? `${number}${/^\d/.test(ingredient.name) ? ' ×' : ''}`
			: `${number} ${ingredient.unit}`;
	}
	return (
		[amount, ingredient.name].filter(Boolean).join(' ') +
		(ingredient.prepNote ? `, ${ingredient.prepNote}` : '')
	);
}

/** The add/edit recipe form's values, as typed: ingredients and steps one per line. */
export interface RecipeFormValues {
	title: string;
	baseServings: string;
	prepMinutes: string;
	cookMinutes: string;
	restMinutes: string;
	cuisine: string;
	isVegetarian: boolean;
	isVegan: boolean;
	proteins: string[];
	ingredients: string;
	steps: string;
	energyKj: string;
	proteinG: string;
	carbsG: string;
	fatG: string;
	sugarsG: string;
	fibreG: string;
	notes: string;
	/** From an import: which numbers were estimated. Saved as the nutrition's note. */
	sourceNote: string;
}

/** A new recipe's starting values. */
export const BLANK_RECIPE_FORM: RecipeFormValues = {
	title: '',
	baseServings: String(DEFAULT_SERVINGS),
	prepMinutes: '',
	cookMinutes: '',
	restMinutes: '',
	cuisine: '',
	isVegetarian: false,
	isVegan: false,
	proteins: [],
	ingredients: '',
	steps: '',
	energyKj: '',
	proteinG: '',
	carbsG: '',
	fatG: '',
	sugarsG: '',
	fibreG: '',
	notes: '',
	sourceNote: ''
};

/** The proteins a home recipe can be tagged with (the library's filter uses the same words). */
export const PROTEIN_OPTIONS = [
	'chicken',
	'beef',
	'pork',
	'turkey',
	'fish',
	'shellfish',
	'egg',
	'tofu',
	'legumes',
	'dairy',
	'nuts'
] as const;
