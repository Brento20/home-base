/**
 * Recipe import for Add a recipe: a link, some pasted text, or a photo of a cookbook page,
 * turned into the form's values for a person to check and save.
 *
 * A link tries the page's own recipe data first (schema.org Recipe in JSON-LD, which most
 * recipe sites publish for search engines). That needs no AI at all, so it works even when the
 * AI is off or failing. Only a page without it, pasted text or a photo goes to Claude.
 */
import { askForJson, imageBlock, textBlock } from '#lib/server/ai.js';
import { BLANK_RECIPE_FORM, PROTEIN_OPTIONS, type RecipeFormValues } from './recipe.js';
import {
	clampServes,
	fetchPage,
	findRecipeData,
	linkIn,
	pageText,
	TEXT_MAX_CHARS,
	valuesFromRecipeData,
	type ImportSource
} from './recipe-page.js';

// Claude ----------------------------------------------------------------------------------------

interface AiRecipe {
	isRecipe: boolean;
	title: string;
	serves: number;
	prepMinutes: number;
	cookMinutes: number;
	restMinutes: number;
	cuisine: string;
	vegetarian: boolean;
	vegan: boolean;
	proteins: string[];
	ingredients: string[];
	steps: string[];
	notes: string;
	energyKj: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	sugarsG: number;
	fibreG: number;
}

const number = { type: 'number' };
const RECIPE_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: [
		'isRecipe',
		'title',
		'serves',
		'prepMinutes',
		'cookMinutes',
		'restMinutes',
		'cuisine',
		'vegetarian',
		'vegan',
		'proteins',
		'ingredients',
		'steps',
		'notes',
		'energyKj',
		'proteinG',
		'carbsG',
		'fatG',
		'sugarsG',
		'fibreG'
	],
	properties: {
		isRecipe: { type: 'boolean' },
		title: { type: 'string' },
		serves: { type: 'integer' },
		prepMinutes: { type: 'integer' },
		cookMinutes: { type: 'integer' },
		restMinutes: { type: 'integer' },
		cuisine: { type: 'string' },
		vegetarian: { type: 'boolean' },
		vegan: { type: 'boolean' },
		proteins: { type: 'array', items: { type: 'string', enum: [...PROTEIN_OPTIONS] } },
		ingredients: { type: 'array', items: { type: 'string' } },
		steps: { type: 'array', items: { type: 'string' } },
		notes: { type: 'string' },
		energyKj: number,
		proteinG: number,
		carbsG: number,
		fatG: number,
		sugarsG: number,
		fibreG: number
	}
};

const SYSTEM = `You turn recipes into a household cookbook's form. Australian English, metric units.
- isRecipe: false if this isn't a recipe at all (then leave everything else empty or 0).
- title: the dish name in sentence case, e.g. "Chicken and leek pie".
- serves: how many it serves (1 to 12; 2 if it doesn't say).
- Minutes are whole numbers; 0 when unknown.
- cuisine: one word or two, e.g. "Italian", or "" if unclear.
- ingredients: one per item, amount first, for the stated serves, like "200 g chicken thigh, sliced", "1 tsp ground cumin", "2 garlic cloves, crushed", "Salt, to taste". Convert cups and ounces to metric where it's sensible.
- steps: one per step, no numbering. Where a step repeats an amount, prefer words like "half the stock" so the method reads right at any serving count.
- notes: a short tip from the recipe if there is one, else "".
- Nutrition per serve only if the source states it; otherwise 0 for all of them. Convert Calories to kJ (× 4.184).
- Never invent ingredients or steps that aren't in the source.`;

function valuesFromAi(recipe: AiRecipe | null): RecipeFormValues | null {
	if (!recipe?.isRecipe) return null;
	const ingredients = recipe.ingredients.map((line) => line.trim()).filter(Boolean);
	const steps = recipe.steps.map((line) => line.trim()).filter(Boolean);
	if (!recipe.title.trim() || ingredients.length === 0 || steps.length === 0) return null;

	const amount = (value: number) => (value > 0 ? String(Math.round(value * 10) / 10) : '');
	const minutes = (value: number) => (value > 0 ? String(Math.round(value)) : '');
	const hasNutrition = recipe.energyKj > 0 && recipe.proteinG > 0;
	const proteins = recipe.proteins.filter((protein) =>
		(PROTEIN_OPTIONS as readonly string[]).includes(protein)
	);

	return {
		...BLANK_RECIPE_FORM,
		title: recipe.title.trim().slice(0, 120),
		baseServings: clampServes(recipe.serves),
		prepMinutes: minutes(recipe.prepMinutes),
		cookMinutes: minutes(recipe.cookMinutes),
		restMinutes: minutes(recipe.restMinutes),
		cuisine: recipe.cuisine.trim().slice(0, 60),
		isVegetarian: recipe.vegetarian || recipe.vegan,
		isVegan: recipe.vegan,
		proteins: [...new Set(proteins)],
		ingredients: ingredients.slice(0, 60).join('\n'),
		steps: steps.slice(0, 40).join('\n'),
		notes: recipe.notes.trim().slice(0, 1000),
		energyKj: hasNutrition ? String(Math.round(recipe.energyKj)) : '',
		proteinG: hasNutrition ? amount(recipe.proteinG) : '',
		carbsG: hasNutrition ? amount(recipe.carbsG) : '',
		fatG: hasNutrition ? amount(recipe.fatG) : '',
		sugarsG: hasNutrition ? amount(recipe.sugarsG) : '',
		fibreG: hasNutrition ? amount(recipe.fibreG) : ''
	};
}

const askAboutText = async (text: string) =>
	valuesFromAi(
		await askForJson<AiRecipe>({
			system: SYSTEM,
			content: `Here's the recipe:\n\n${text.slice(0, TEXT_MAX_CHARS)}`,
			schema: RECIPE_SCHEMA,
			maxTokens: 4000
		})
	);

/**
 * Reads the import box: a photo, a link or pasted text. Returns the form's values and where they
 * came from, or null when it couldn't be read (the page then asks for it by hand).
 */
export async function importRecipe(
	form: FormData
): Promise<{ values: RecipeFormValues; source: ImportSource } | null> {
	const text = String(form.get('text') ?? '').trim();
	const photo = await imageBlock(form.get('photo'));

	if (photo) {
		const values = valuesFromAi(
			await askForJson<AiRecipe>({
				model: 'sharp',
				system: SYSTEM,
				content: [photo, textBlock(text || 'Read the recipe in this photo.')],
				schema: RECIPE_SCHEMA,
				maxTokens: 4000,
				timeoutMs: 45_000
			})
		);
		return values ? { values, source: 'photo' } : null;
	}

	const link = linkIn(text);
	if (link) {
		const html = await fetchPage(link);
		if (!html) return null;
		const data = findRecipeData(html);
		const fromData = data ? valuesFromRecipeData(data) : null;
		if (fromData) return { values: fromData, source: 'link' };
		const values = await askAboutText(pageText(html));
		return values ? { values, source: 'link' } : null;
	}

	if (text.length < 20) return null;
	const values = await askAboutText(text);
	return values ? { values, source: 'text' } : null;
}
