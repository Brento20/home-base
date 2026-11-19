/**
 * Recipe import for Add a recipe: a link, some pasted text, or a photo of a cookbook page,
 * turned into the form's values for a person to check and save.
 *
 * A link reads the page's own recipe data (schema.org Recipe in JSON-LD, which most recipe sites
 * publish for search engines), tidied without AI (recipe-page.ts). Claude then reads that with
 * the recipe card's text, to tidy the wording and estimate what the data lacks (often times,
 * nutrition, cuisine). If Claude doesn't answer, the tidied data is used as it is. Pasted text
 * and photos go to Claude alone. SYSTEM below is the field-by-field guide Claude follows, and
 * `sourceNote` records which fields were estimated, for the recipe's "About these numbers".
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
	ESTIMATES,
	sourceNote,
	valuesFromRecipeData,
	type Estimate,
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
	/** Which fields were estimated rather than taken from the recipe. */
	estimated: Estimate[];
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
		'fibreG',
		'estimated'
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
		fibreG: number,
		estimated: { type: 'array', items: { type: 'string', enum: [...ESTIMATES] } }
	}
};

/** The cuisines the library already uses, so imports land in the same filter. */
const KNOWN_CUISINES =
	'Italian, Mediterranean, South Asian, Indian, Sri Lankan, Chinese, Japanese, Thai, East Asian, British, French, Mexican, Tex-Mex, Moroccan, Modern Australian, Italian-American, Contemporary';

/**
 * How to turn a recipe into the cookbook's form, field by field. The person checks the result
 * before saving, so a field the recipe leaves out gets a careful estimate rather than a blank,
 * and `estimated` says which, for the recipe's "About these numbers" note.
 */
const SYSTEM = `You fill in a household cookbook's "Add a recipe" form from a recipe. Write in Australian English with metric units. The person will check your answer before saving.

You may be given structured recipe data (already tidied) and the text of the recipe card or page. Treat the structured data as the source of truth for ingredients and steps; use the text for anything missing (times, servings, notes) and to correct obvious errors.

isRecipe: false only if there's no recipe here at all; then leave the rest empty or 0.

title: the dish's name in sentence case, keeping proper nouns ("New Orleans chicken wings", "Pad Thai"). Drop words like "recipe", "easy", "best", "the ultimate", the site's name and emoji.

serves: one whole number, 1 to 12. For a range or "4 as a meal, 8–10 as a snack", use the main-meal number, else the smallest. 2 if nothing says.

prepMinutes, cookMinutes, restMinutes: whole minutes, rounded to the nearest 5.
- Use times the recipe states.
- If a time isn't stated, estimate it from the method: cook is the time on the heat or in the oven (the top of a range, so "45–50 minutes" is 50); prep is a realistic hands-on time for a home cook.
- rest is resting, marinating, chilling, proving or cooling the method asks for, or that the dish clearly needs (a roast resting, dough proving); 0 if none. Overnight is 480.

cuisine: one short label. Use one of these if it fits: ${KNOWN_CUISINES}. Otherwise a common one or two words, like "Cajun", "American", "Korean", "Greek". If the recipe doesn't say, give your best judgement from the dish and its flavours.

vegetarian, vegan: from the ingredients. No meat, poultry, seafood, gelatine, or meat or fish stock or sauce. Vegan also has no egg, dairy or honey.

proteins: the main proteins in the dish, from the list. Butter, a splash of milk or a sprinkle of cheese isn't "dairy", and fish sauce isn't "fish".

ingredients: every ingredient, one per line, in the recipe's order, for the serves above, written as "amount unit name, prep note":
- "1.25 kg chicken wings, cut into drumettes and wingettes", "50 g unsalted butter", "2 garlic cloves, crushed", "1.5 tsp brown sugar, firmly packed", "Salt and pepper, to taste".
- Units: only g, kg, ml, L, tsp, tbsp or cup; things you count have no unit ("2 eggs", "1 brown onion, diced"). Decimals, not fractions.
- Metric only: where both are given, keep the metric and drop the imperial; convert lb, oz, fl oz and °F.
- The name is the ingredient a shopper looks for ("coriander", "cooking salt"); size, colour or type can come first ("large eggs", "dried thyme"). Everything else (cutting, packing, substitutes, "or parsley", "for garnish", "optional") goes after the comma, briefly.
- No brackets, brand names, "Note 1" or "see notes" pointers, links or HTML.
- If the ingredients come in groups (a spice mix, a sauce), keep them in order; the steps say which group is used when.

steps: the full method, one step per line, no numbering.
- If there's a short or "abbreviated" version and a full one, use only the full one.
- Usually 4 to 10 steps. Each starts with what to do ("Preheat the oven to 200°C (180°C fan-forced)."). Combine tiny steps; split a step that does several unrelated things.
- Keep temperatures in °C (with the fan-forced figure if given), times and doneness cues ("until golden and sticky").
- Don't repeat amounts from the ingredients: say "half the seasoning", "the butter mixture", so the method reads right at any serving count.
- Leave out chat and asides ("you'll thank me later!", "Enjoy!", "weep with joy"), notes pointers, links and photo or video mentions. A final "serve" step is fine if it says what to do ("Sprinkle with coriander and serve.").

notes: one to three short, practical tips from the recipe or its notes, in your own words: what matters most (like "Don't crowd the tray or the wings won't brown"), a key swap or a make-ahead tip. Under 300 characters. "" if there's nothing useful.

energyKj, proteinG, carbsG, fatG, sugarsG, fibreG: per serve. Copy them if the recipe states nutrition (Calories × 4.184 is kJ). If it doesn't, estimate them from the ingredients and amounts divided by serves, using typical Australian food composition values (like FSANZ's AUSNUT data): energy to the nearest 10 kJ, grams to one decimal. Count what's eaten, not what's discarded (bones, marinade left behind, deep-frying oil mostly).

estimated: list every field you estimated or judged rather than read from the recipe: "nutrition", "prepTime", "cookTime", "restTime", "cuisine", "proteins". Leave a field out if the recipe states it (a stated rest of none counts as stated). An empty list means everything came straight from the recipe.

Never invent ingredients or steps that aren't in the recipe.`;

function valuesFromAi(recipe: AiRecipe | null, from: string): RecipeFormValues | null {
	if (!recipe?.isRecipe) return null;
	const ingredients = recipe.ingredients.map((line) => line.trim()).filter(Boolean);
	const steps = recipe.steps.map((line) => line.trim()).filter(Boolean);
	if (!recipe.title.trim() || ingredients.length === 0 || steps.length === 0) return null;

	const amount = (value: number) => (value > 0 ? String(Math.round(value * 10) / 10) : '');
	// A day at most: anything longer is a misreading.
	const minutes = (value: number) => (value > 0 ? String(Math.min(1440, Math.round(value))) : '');
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
		fibreG: hasNutrition ? amount(recipe.fibreG) : '',
		sourceNote: sourceNote(
			from,
			recipe.estimated.filter((field) => field !== 'nutrition' || hasNutrition)
		)
	};
}

const askAboutText = async (text: string) =>
	valuesFromAi(
		await askForJson<AiRecipe>({
			system: SYSTEM,
			content: `Here's the recipe:\n\n${text.slice(0, TEXT_MAX_CHARS)}`,
			schema: RECIPE_SCHEMA,
			maxTokens: 4000
		}),
		'Read from pasted text'
	);

/** A recipe page: the tidied structured data (if any) plus the card's text, read together. */
async function askAboutPage(draft: RecipeFormValues | null, text: string, from: string) {
	const structured = draft
		? `STRUCTURED RECIPE DATA (tidied):\n${JSON.stringify(
				{
					title: draft.title,
					serves: draft.baseServings,
					prepMinutes: draft.prepMinutes,
					cookMinutes: draft.cookMinutes,
					cuisine: draft.cuisine,
					ingredients: draft.ingredients.split('\n'),
					steps: draft.steps.split('\n'),
					nutritionPerServe: draft.energyKj
						? {
								energyKj: draft.energyKj,
								proteinG: draft.proteinG,
								carbsG: draft.carbsG,
								fatG: draft.fatG
							}
						: 'not stated'
				},
				null,
				1
			)}\n\n`
		: '';
	return valuesFromAi(
		await askForJson<AiRecipe>({
			system: SYSTEM,
			content: `${structured}PAGE TEXT:\n${text}`,
			schema: RECIPE_SCHEMA,
			maxTokens: 4000,
			timeoutMs: 40_000
		}),
		from
	);
}

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
			}),
			'Read from a photo of the recipe'
		);
		return values ? { values, source: 'photo' } : null;
	}

	const link = linkIn(text);
	if (link) {
		const html = await fetchPage(link);
		if (!html) return null;
		// The page's own recipe data, tidied. On its own it's a decent fill; Claude reads it with
		// the recipe card to tidy the wording and estimate what it lacks (often times, nutrition).
		const from = `Imported from ${link.hostname.replace(/^www\./, '')}`;
		const data = findRecipeData(html);
		const parsed = data ? valuesFromRecipeData(data) : null;
		const draft = parsed && { ...parsed, sourceNote: sourceNote(from, []) };
		const values = (await askAboutPage(draft, pageText(html), from)) ?? draft;
		return values ? { values, source: 'link' } : null;
	}

	if (text.length < 20) return null;
	const values = await askAboutText(text);
	return values ? { values, source: 'text' } : null;
}
