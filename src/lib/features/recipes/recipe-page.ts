/**
 * Reading a recipe page without AI: the schema.org Recipe data most recipe sites publish in
 * JSON-LD for search engines, and the page's plain words for when Claude has to read it instead.
 * No server-only imports, so it's easy to test on its own.
 */
import { BLANK_RECIPE_FORM, SERVINGS_MAX, SERVINGS_MIN, type RecipeFormValues } from './recipe.js';

export type ImportSource = 'link' | 'text' | 'photo';

export const PAGE_TIMEOUT_MS = 8000;
export const PAGE_MAX_CHARS = 1_500_000;
/** Plenty for a recipe, and keeps the request small. */
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

/** The first number in "350 kcal", "12 g" or 12. */
const firstNumber = (value: unknown) => {
	const match = String(value ?? '').match(/\d+(?:[.,]\d+)?/);
	return match ? Number(match[0].replace(',', '.')) : null;
};

const decodeEntities = (text: string) =>
	text
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&#x27;|&rsquo;/g, '’')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

/** Plain text from a field that may hold HTML: inline tags vanish, others become a space. */
const clean = (value: unknown) =>
	decodeEntities(
		asText(value)
			.replace(/<\/?(b|i|em|strong|span|a|u|sup|sub)\b[^>]*>/gi, '')
			.replace(/<[^>]+>/g, ' ')
	)
		.replace(/\s+/g, ' ')
		.replace(/\s+([.,;:!?])/g, '$1')
		.trim();

/** Steps from HowToStep, HowToSection or plain strings, one per line. */
function instructionLines(value: unknown): string[] {
	if (typeof value === 'string') return value.split(/\n+/).map(clean).filter(Boolean);
	if (Array.isArray(value)) return value.flatMap(instructionLines);
	if (value && typeof value === 'object') {
		const step = value as Record<string, unknown>;
		if (step.itemListElement) return instructionLines(step.itemListElement);
		return [clean(step.text ?? step.name)].filter(Boolean);
	}
	return [];
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

/** schema.org Recipe → form values. Null when it hasn't got the basics. */
export function valuesFromRecipeData(data: Record<string, unknown>): RecipeFormValues | null {
	const ingredients = [data.recipeIngredient ?? data.ingredients].flat().map(clean).filter(Boolean);
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

	return {
		...BLANK_RECIPE_FORM,
		title: title.slice(0, 120),
		baseServings: clampServes(firstNumber([data.recipeYield].flat()[0]) ?? 2),
		prepMinutes: isoMinutes(data.prepTime),
		cookMinutes: isoMinutes(data.cookTime),
		cuisine: clean([data.recipeCuisine].flat()[0]).slice(0, 60),
		ingredients: ingredients.slice(0, 60).join('\n'),
		steps: steps.slice(0, 40).join('\n'),
		energyKj: hasNutrition ? String(Math.round(kcal! * 4.184)) : '',
		proteinG: hasNutrition ? grams(nutrition.proteinContent) : '',
		carbsG: hasNutrition ? grams(nutrition.carbohydrateContent) : '',
		fatG: hasNutrition ? grams(nutrition.fatContent) : '',
		sugarsG: hasNutrition ? grams(nutrition.sugarContent) : '',
		fibreG: hasNutrition ? grams(nutrition.fiberContent) : ''
	};
}

/** The readable words on a page, for Claude, without scripts, styles and tags. */
export function pageText(html: string) {
	return decodeEntities(
		html
			.replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
			.replace(/<br\s*\/?>|<\/(p|li|h\d|div|tr)>/gi, '\n')
			.replace(/<[^>]+>/g, ' ')
	)
		.replace(/[ \t]+/g, ' ')
		.replace(/\n\s*\n+/g, '\n')
		.trim()
		.slice(0, TEXT_MAX_CHARS);
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
