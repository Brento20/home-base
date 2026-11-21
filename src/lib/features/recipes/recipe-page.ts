/**
 * Reading a recipe page without AI: the schema.org Recipe data most recipe sites publish in
 * JSON-LD for search engines, tidied into the cookbook's form, and the recipe card's plain words
 * for Claude to read alongside it. No server-only imports, so it's easy to test on its own.
 *
 * Recipe plugins (WP Recipe Maker, Tasty, Mediavine) put a lot of noise into that data: metric
 * and imperial side by side ("1.25 kg / 2.5 lb"), doubled brackets, HTML entities, "Note 1"
 * pointers to a notes section, temperatures in °C and °F, and sometimes a short "abbreviated"
 * method ahead of the full one. The tidy-ups below take those out, so even the no-AI result is
 * close to what someone would type.
 */
import {
	BLANK_RECIPE_FORM,
	ingredientLine,
	parseIngredientLine,
	PROTEIN_OPTIONS,
	SERVINGS_MAX,
	SERVINGS_MIN,
	type Ingredient,
	type RecipeFormValues
} from './recipe.js';

export type ImportSource = 'link' | 'text' | 'photo';

/** Fields Claude may estimate when a recipe leaves them out. */
export const ESTIMATES = [
	'nutrition',
	'prepTime',
	'cookTime',
	'restTime',
	'cuisine',
	'proteins'
] as const;
export type Estimate = (typeof ESTIMATES)[number];

const ESTIMATE_WORDS: Record<Estimate, string> = {
	nutrition: 'nutrition per serve (from the ingredients)',
	prepTime: 'prep time',
	cookTime: 'cook time',
	restTime: 'rest time',
	cuisine: 'cuisine',
	proteins: 'protein'
};

const listed = (words: string[]) =>
	words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0];

/**
 * The recipe's "About these numbers": where it came from and which fields were estimated, e.g.
 * "Imported from recipetineats.com. Estimated by AI: nutrition per serve (from the
 * ingredients), prep and rest time (from the method) and cuisine. The rest is as the recipe
 * gives it." Times are grouped so they read naturally.
 */
export function sourceNote(from: string, estimated: readonly string[]): string {
	const marked = new Set(estimated);
	const parts: string[] = [];
	if (marked.has('nutrition')) parts.push(ESTIMATE_WORDS.nutrition);
	const times = (['prepTime', 'cookTime', 'restTime'] as const)
		.filter((key) => marked.has(key))
		.map((key) => ESTIMATE_WORDS[key].replace(' time', ''));
	if (times.length)
		parts.push(`${listed(times)} time${times.length > 1 ? 's' : ''} (from the method)`);
	if (marked.has('cuisine')) parts.push(ESTIMATE_WORDS.cuisine);
	if (marked.has('proteins')) parts.push(ESTIMATE_WORDS.proteins);

	if (!parts.length) return `${from}, as the recipe gives it.`;
	return `${from}. Estimated by AI: ${listed(parts)}. The rest is as the recipe gives it. Estimates are a guide: brands and portions vary.`;
}

export const PAGE_TIMEOUT_MS = 8000;
export const PAGE_MAX_CHARS = 1_500_000;
/** Plenty for a recipe card, and keeps the request small. */
export const TEXT_MAX_CHARS = 24_000;

export const clampServes = (value: number) =>
	String(Math.min(SERVINGS_MAX, Math.max(SERVINGS_MIN, Math.round(value) || 2)));

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** "PT1H30M" → 90. Anything unreadable → ''. */
export function isoMinutes(value: unknown): string {
	const match = asText(value).match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
	if (!match) return '';
	const [, days = '0', hours = '0', mins = '0'] = match;
	const total = Number(days) * 1440 + Number(hours) * 60 + Number(mins);
	return total > 0 ? String(total) : '';
}

/** The first number in "350 kcal", "12 g", ["4", "4 - 10"] or 12. */
const firstNumber = (value: unknown) => {
	const match = String([value].flat()[0] ?? '').match(/\d+(?:[.,]\d+)?/);
	return match ? Number(match[0].replace(',', '.')) : null;
};

/** Entities, decoded until they stop changing: some sites double-encode ("&amp;#39;"). */
function decodeEntities(text: string) {
	let previous = '';
	let current = text;
	while (current !== previous) {
		previous = current;
		current = current
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&#39;|&#x27;|&rsquo;|&lsquo;/g, '’')
			.replace(/&ldquo;|&rdquo;/g, '"')
			.replace(/&ndash;|&mdash;/g, '–')
			.replace(/&deg;/g, '°')
			.replace(/&frac12;/g, '½')
			.replace(/&frac14;/g, '¼')
			.replace(/&frac34;/g, '¾')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
	}
	return current;
}

/** Plain text from a field that may hold HTML: inline tags vanish, others become a space. */
const clean = (value: unknown) =>
	decodeEntities(
		asText(value)
			.replace(/<\/?(b|i|em|strong|span|a|u|sup|sub)\b[^>]*>/gi, '')
			.replace(/<[^>]+>/g, ' ')
	)
		.replace(/\s+/g, ' ')
		.replace(/\s+([.,;:!?)])/g, '$1')
		.replace(/\(\s+/g, '(')
		.trim();

/** Takes out pointers to a notes section: "(Note 2)", ", Note 1", "(see note 3 about…)". */
function withoutNoteRefs(text: string) {
	return text
		.replace(/\(\s*(?:see\s+)?(?:recipe\s+)?notes?\s*\d*\b[^()]*\)/gi, '')
		.replace(/,?\s*(?:see\s+)?(?:recipe\s+)?notes?\s+\d+\b[^,)]*/gi, '');
}

const METRIC = String.raw`\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l)\b`;
const IMPERIAL = String.raw`[\d.,/\s¼½¾⅓⅔]+\s*(?:lbs?|oz|fl\.?\s*oz|cups?|tbsp|tsp|pints?|quarts?)\b\.?`;

/**
 * One ingredient line in the cookbook's shape, "amount unit name, prep note":
 * "1.25 kg / 2.5 lb  chicken wings cut up ((wingettes &amp; drumettes, Note 1))"
 * → "1.25 kg chicken wings cut up, wingettes & drumettes".
 */
export function tidyIngredientLine(raw: unknown): string {
	let line = clean(raw);
	// Metric first, then an imperial alternative: keep the metric.
	line = line.replace(new RegExp(`^(${METRIC})\\s*/\\s*${IMPERIAL}`, 'i'), '$1');
	// Imperial first with a metric alternative: keep the metric.
	line = line.replace(new RegExp(`^${IMPERIAL}\\s*/\\s*(${METRIC})`, 'i'), '$1');
	line = line.replace(/\(\(/g, '(').replace(/\)\)/g, ')');
	line = withoutNoteRefs(line);

	// The first bracket becomes the prep note: "2 garlic cloves (, crushed)" → ", crushed".
	const open = line.indexOf('(');
	if (open >= 0) {
		let depth = 0;
		let close = -1;
		for (let i = open; i < line.length; i++) {
			if (line[i] === '(') depth++;
			if (line[i] === ')' && --depth === 0) {
				close = i;
				break;
			}
		}
		const inside = line
			.slice(open + 1, close < 0 ? undefined : close)
			.replace(/^[\s,]+|[\s,]+$/g, '');
		const outside = (line.slice(0, open) + (close < 0 ? '' : line.slice(close + 1))).trim();
		line = inside ? `${outside.replace(/,\s*$/, '')}, ${inside}` : outside;
	}

	return line
		.replace(/^(\d+(?:[.,]\d+)?)(kg|g|ml|l)\b/i, '$1 $2')
		.replace(/\(\s*\)/g, '')
		.replace(/\s+,/g, ',')
		.replace(/,{2,}/g, ',')
		.replace(/\s{2,}/g, ' ')
		.replace(/^[,\s]+|[,\s]+$/g, '');
}

/**
 * One method step, tidied: no notes pointers, °C only (fan-forced kept), and a leading label
 * like "Toss - Put the wings…" written as "Toss: Put the wings…".
 */
export function tidyStep(raw: unknown): string {
	return withoutNoteRefs(clean(raw))
		.replace(/(\d+\s*°\s*C)\s*\/\s*\d+\s*°\s*F/gi, '$1')
		.replace(/\d+\s*°\s*F\s*\/\s*(\d+\s*°\s*C)/gi, '$1')
		.replace(/^([A-Z][\w’' ]{1,24}?)\s+[-–]\s+(?=[A-Z])/, '$1: ')
		.replace(/\s+([.,;:!?)])/g, '$1')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

/** A section that repeats the method in brief, ahead of the full one. */
const SUMMARY_SECTION =
	/abbreviated|quick (version|method|recipe)|short version|summary|overview|tl;?dr|at a glance/i;

/**
 * Steps from HowToStep, HowToSection or plain strings, one per line. A summary section is
 * skipped when there's a full method too. With several real sections ("Sauce", "Chicken"), each
 * one's first step is labelled with its name.
 */
export function instructionLines(value: unknown): string[] {
	if (typeof value === 'string')
		return value
			.split(/\n+|(?<=\.)\s+(?=\d+[.)]\s)/)
			.map((step) => tidyStep(step.replace(/^\d+[.)]\s*/, '')))
			.filter(Boolean);
	if (!Array.isArray(value)) return value ? instructionLines([value]) : [];

	const isSection = (node: unknown) =>
		Boolean(node && typeof node === 'object' && 'itemListElement' in node);
	const sections = value.filter(isSection) as Record<string, unknown>[];
	if (sections.length === 0)
		return value.flatMap((node) => {
			if (typeof node === 'string') return instructionLines(node);
			const step = node as Record<string, unknown>;
			const text = tidyStep(step?.text ?? step?.name);
			return text ? [text] : [];
		});

	const full = sections.filter((section) => !SUMMARY_SECTION.test(clean(section.name)));
	const kept = full.length ? full : sections;
	return kept.flatMap((section) => {
		const steps = instructionLines(section.itemListElement);
		const name = clean(section.name)
			.replace(/[:.]+$/, '')
			.trim();
		const label =
			kept.length > 1 && name && !/^(method|instructions|directions|full recipe)$/i.test(name);
		if (label && steps[0])
			steps[0] = `${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()}: ${steps[0]}`;
		return steps;
	});
}

/** Finds a schema.org Recipe anywhere in a page's JSON-LD blocks. */
export function findRecipeData(html: string): Record<string, unknown> | null {
	const blocks = html.matchAll(
		/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
	);
	const isRecipe = (node: Record<string, unknown>) =>
		[node['@type']].flat().some((type) => String(type).toLowerCase() === 'recipe');

	const search = (node: unknown): Record<string, unknown> | null => {
		if (Array.isArray(node)) {
			for (const child of node) {
				const found = search(child);
				if (found) return found;
			}
			return null;
		}
		if (!node || typeof node !== 'object') return null;
		const record = node as Record<string, unknown>;
		if (isRecipe(record)) return record;
		return search(record['@graph']);
	};

	for (const [, json] of blocks) {
		try {
			const found = search(JSON.parse(json.trim()));
			if (found) return found;
		} catch {
			// One broken block shouldn't stop the others being read.
		}
	}
	return null;
}

/** Words that tag a recipe's protein, checked against ingredient names. */
const PROTEIN_WORDS: Record<(typeof PROTEIN_OPTIONS)[number], RegExp> = {
	chicken: /\bchicken\b(?!\s+(stock|broth|bouillon|powder|salt))/i,
	beef: /\b(beef|steak|brisket|mince(?!d)|veal)\b(?!\s+(stock|broth))/i,
	pork: /\b(pork|bacon|ham|pancetta|prosciutto|chorizo|sausages?)\b/i,
	turkey: /\bturkey\b/i,
	fish: /\b(fish|salmon|tuna|cod|snapper|barramundi|trout|basa|ling|mackerel|sardines?|anchov(y|ies))\b(?!\s+sauce)/i,
	shellfish: /\b(prawns?|shrimp|scallops?|mussels?|clams?|crab|lobster|squid|calamari|octopus)\b/i,
	egg: /\beggs?\b/i,
	tofu: /\b(tofu|tempeh)\b/i,
	legumes: /\b(lentils?|chickpeas?|beans?|split peas)\b/i,
	dairy: /\b(cheese|paneer|halloumi|ricotta|feta|mozzarella|haloumi|yoghurt|yogurt)\b/i,
	nuts: /\b(almonds?|cashews?|peanuts?|walnuts?|pecans?|pistachios?|hazelnuts?)\b/i
};

/** Proteins a recipe uses, from its ingredient lines (stock and fish sauce don't count). */
export function proteinsIn(ingredients: string[]): string[] {
	const names = ingredients.map((line) => line.split(',')[0]);
	return PROTEIN_OPTIONS.filter((protein) =>
		names.some((name) => PROTEIN_WORDS[protein].test(name))
	);
}

/** schema.org Recipe → form values. Null when it hasn't got the basics. */
export function valuesFromRecipeData(data: Record<string, unknown>): RecipeFormValues | null {
	const ingredients = [data.recipeIngredient ?? data.ingredients]
		.flat()
		.map(tidyIngredientLine)
		.filter(Boolean);
	const steps = instructionLines(data.recipeInstructions);
	const title = clean(data.name);
	if (!title || ingredients.length === 0 || steps.length === 0) return null;

	const nutrition = (data.nutrition ?? {}) as Record<string, unknown>;
	const kcal = firstNumber(nutrition.calories);
	const protein = firstNumber(nutrition.proteinContent);
	const grams = (value: unknown) => {
		const number = firstNumber(value);
		return number === null ? '' : String(Math.round(number * 10) / 10);
	};
	const hasNutrition = kcal !== null && protein !== null;
	const diets = [data.suitableForDiet].flat().map(String).join(' ');
	const vegan = /VeganDiet/i.test(diets);

	return {
		...BLANK_RECIPE_FORM,
		title: title.slice(0, 120),
		baseServings: clampServes(firstNumber(data.recipeYield) ?? 2),
		prepMinutes: isoMinutes(data.prepTime),
		cookMinutes: isoMinutes(data.cookTime),
		cuisine: clean([data.recipeCuisine].flat()[0]).slice(0, 60),
		isVegetarian: vegan || /VegetarianDiet/i.test(diets),
		isVegan: vegan,
		proteins: proteinsIn(ingredients),
		// Read and written back the way the form saves them, so ranges and units come out clean.
		ingredients: ingredients
			.map((line) => parseIngredientLine(line))
			.filter((ingredient): ingredient is Ingredient => ingredient !== null)
			.slice(0, 60)
			.map(ingredientLine)
			.join('\n'),
		steps: steps.slice(0, 40).join('\n'),
		energyKj: hasNutrition ? String(Math.round(kcal! * 4.184)) : '',
		proteinG: hasNutrition ? grams(nutrition.proteinContent) : '',
		carbsG: hasNutrition ? grams(nutrition.carbohydrateContent) : '',
		fatG: hasNutrition ? grams(nutrition.fatContent) : '',
		sugarsG: hasNutrition ? grams(nutrition.sugarContent) : '',
		fibreG: hasNutrition ? grams(nutrition.fiberContent) : ''
	};
}

/** Where a recipe plugin's card starts, so Claude reads the card, not the life story above it. */
const CARD_START =
	/<(?:div|section)[^>]+class=["'][^"']*\b(?:wprm-recipe-container|wprm-recipe|tasty-recipes|mv-create-card|recipe-card|wp-block-recipe|easyrecipe)\b/i;

/**
 * The readable words on a page, for Claude, without scripts, styles and tags. If there's a
 * recipe card, its text comes first (servings, times, the notes), then the start of the page.
 */
export function pageText(html: string) {
	const words = (part: string) =>
		decodeEntities(
			part
				.replace(/<(script|style|noscript|svg|nav|footer|header|form|aside)[\s\S]*?<\/\1>/gi, ' ')
				.replace(/<br\s*\/?>|<\/(p|li|h\d|div|tr|section)>/gi, '\n')
				.replace(/<[^>]+>/g, ' ')
		)
			.replace(/[ \t]+/g, ' ')
			.replace(/\n\s*\n+/g, '\n')
			.trim();

	const card = html.search(CARD_START);
	if (card < 0) return words(html).slice(0, TEXT_MAX_CHARS);
	const cardText = words(html.slice(card, card + 200_000)).slice(0, TEXT_MAX_CHARS * 0.75);
	const rest = words(html.slice(0, card)).slice(0, TEXT_MAX_CHARS - cardText.length);
	return `RECIPE CARD:\n${cardText}\n\nSTART OF THE PAGE:\n${rest}`;
}

export async function fetchPage(url: URL): Promise<string | null> {
	try {
		const response = await fetch(url, {
			headers: { accept: 'text/html', 'user-agent': 'home-base recipe import' },
			redirect: 'follow',
			signal: AbortSignal.timeout(PAGE_TIMEOUT_MS)
		});
		if (!response.ok || !response.headers.get('content-type')?.includes('html')) return null;
		return (await response.text()).slice(0, PAGE_MAX_CHARS);
	} catch {
		return null;
	}
}

/** A lone http(s) link, or null if the text is anything else. */
export function linkIn(text: string): URL | null {
	if (!/^https?:\/\/\S+$/i.test(text)) return null;
	try {
		const url = new URL(text);
		// Public pages only: never let a pasted link reach into a private network.
		if (
			/^(localhost|0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(
				url.hostname
			)
		)
			return null;
		return url;
	} catch {
		return null;
	}
}
