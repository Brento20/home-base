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
import {
	BLANK_RECIPE_FORM,
	ingredientLine,
	parseIngredientLine,
	PROTEIN_OPTIONS,
	type Ingredient,
	type RecipeFormValues
} from './recipe.js';
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

/** One ingredient, field by field, so amounts can't run into names ("80 -100g" → "-100g"). */
interface AiIngredient {
	/** 0 when there's no amount ("to taste"). The low end of a range. */
	amount: number;
	/** The high end of a range ("80–100 g" is 100); 0 when it's one amount. */
	amountMax: number;
	unit: (typeof AI_UNITS)[number];
	name: string;
	prep: string;
}

interface AiNutrition {
	energyKj: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	sugarsG: number;
	fibreG: number;
}

const AI_UNITS = ['g', 'kg', 'ml', 'L', 'tsp', 'tbsp', 'cup', 'none'] as const;

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
	ingredients: AiIngredient[];
	steps: string[];
	notes: string;
	/** Per serve. */
	nutrition: AiNutrition;
	/** Which fields were estimated rather than taken from the recipe. */
	estimated: Estimate[];
}

const number = { type: 'number' };
const NUTRITION_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['energyKj', 'proteinG', 'carbsG', 'fatG', 'sugarsG', 'fibreG'],
	properties: {
		energyKj: number,
		proteinG: number,
		carbsG: number,
		fatG: number,
		sugarsG: number,
		fibreG: number
	}
};
const INGREDIENT_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['amount', 'amountMax', 'unit', 'name', 'prep'],
	properties: {
		amount: number,
		amountMax: number,
		unit: { type: 'string', enum: [...AI_UNITS] },
		name: { type: 'string' },
		prep: { type: 'string' }
	}
};
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
		'nutrition',
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
		ingredients: { type: 'array', items: INGREDIENT_SCHEMA },
		steps: { type: 'array', items: { type: 'string' } },
		notes: { type: 'string' },
		nutrition: NUTRITION_SCHEMA,
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

ingredients: every ingredient, in the recipe's order, for the serves above. Each one is separate fields; never put an amount or unit in the name:
- amount: the number, as a decimal (1.5, not 1 ½; 0.25, not ¼). 0 if there's no amount ("salt, to taste", "oil, for frying").
- amountMax: for a range, the high end, with amount as the low end: "80–100 g noodles" is amount 80, amountMax 100, unit "g"; "2–3 garlic cloves" is 2 and 3. 0 when it's one amount.
- unit: g, kg, ml, L, tsp, tbsp or cup; "none" for things you count ("2 eggs", "1 brown onion") and for no amount. Metric only: where both are given keep the metric; convert lb, oz and fl oz (1 oz = 28 g, 1 lb = 450 g, 1 fl oz = 30 ml). A stick of butter is 113 g.
- "2 × 400 g tins diced tomatoes" is amount 2, unit "none", name "400 g tins diced tomatoes".
- name: what a shopper looks for, in sentence case ("Coriander", "Unsalted butter", "Large eggs", "Dried rice noodles"). Size, colour or type can come first.
- prep: everything else, briefly (cutting, packing, substitutes, "or parsley", "for garnish", "optional", "to taste"); "" if none.
- No brackets, brand names, "Note 1" or "see notes" pointers, links or HTML anywhere.
- If the ingredients come in groups (a spice mix, a sauce), keep them in order; the steps say which group is used when.

steps: the full method, one step per line, no numbering.
- If there's a short or "abbreviated" version and a full one, use only the full one.
- Usually 4 to 10 steps. Each starts with what to do ("Preheat the oven to 200°C (180°C fan-forced)."). Combine tiny steps; split a step that does several unrelated things.
- Keep temperatures in °C (with the fan-forced figure if given), times and doneness cues ("until golden and sticky").
- Don't repeat amounts from the ingredients: say "half the seasoning", "the butter mixture", so the method reads right at any serving count.
- Leave out chat and asides ("you'll thank me later!", "Enjoy!", "weep with joy"), notes pointers, links and photo or video mentions. A final "serve" step is fine if it says what to do ("Sprinkle with coriander and serve.").

notes: one to three short, practical tips from the recipe or its notes, in your own words: what matters most (like "Don't crowd the tray or the wings won't brown"), a key swap or a make-ahead tip. Under 300 characters. "" if there's nothing useful.

nutrition: per serve, always filled in, never 0 for a real dish.
- If the recipe states nutrition, copy it (Calories × 4.184 is kJ; a stated per-recipe figure is divided by serves).
- Otherwise estimate it: work out each ingredient's contribution from its amount (the middle of a range) using typical Australian food composition values (like FSANZ's AUSNUT data), add them up and divide by serves. Count what's eaten, not what's discarded (bones, marinade left behind, most deep-frying oil).
- energyKj to the nearest 10; grams to one decimal. Check the energy roughly matches the macros (protein and carbs 17 kJ per gram, fat 37, fibre 8).

estimated: list every field you estimated or judged rather than read from the recipe: "nutrition", "prepTime", "cookTime", "restTime", "cuisine", "proteins". Leave a field out if the recipe states it (a stated rest of none counts as stated). An empty list means everything came straight from the recipe.

Never invent ingredients or steps that aren't in the recipe.`;

/**
 * An AI ingredient back into the cookbook's own line, checked by reading it the way the form
 * will on save: a line that doesn't come back as the same ingredient is dropped.
 */
function ingredientFromAi(item: AiIngredient): Ingredient | null {
	const name = item.name.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
	if (!name) return null;
	const amount = Number.isFinite(item.amount) && item.amount > 0 ? item.amount : null;
	const big = item.unit === 'kg' || item.unit === 'L' ? 1000 : 1;
	const unit =
		amount === null
			? null
			: item.unit === 'kg'
				? 'g'
				: item.unit === 'L'
					? 'ml'
					: item.unit === 'none'
						? 'each'
						: item.unit;
	const max = amount !== null && item.amountMax > amount ? item.amountMax * big : null;
	const ingredient: Ingredient = {
		name: name.charAt(0).toUpperCase() + name.slice(1),
		quantity: amount === null ? null : amount * big,
		quantityMax: max,
		unit,
		prepNote: item.prep.replace(/[()]/g, '').trim() || null
	};
	// Round-trip through the form's own reader, so what's saved is exactly what was filled.
	return parseIngredientLine(ingredientLine(ingredient));
}

/**
 * Nutrition per serve, tidied: nothing negative, energy in a believable range, and energy
 * worked out from the macros when it's missing or (for an estimate) doesn't add up.
 */
function tidyNutrition(raw: AiNutrition | null | undefined, estimated: boolean) {
	if (!raw) return null;
	const grams = (value: number) =>
		Number.isFinite(value) && value > 0 ? Math.round(value * 10) / 10 : 0;
	const proteinG = grams(raw.proteinG);
	const carbsG = grams(raw.carbsG);
	const fatG = grams(raw.fatG);
	const fibreG = grams(raw.fibreG);
	const sugarsG = Math.min(grams(raw.sugarsG), carbsG || Infinity);
	const fromMacros = Math.round((proteinG * 17 + carbsG * 17 + fatG * 37 + fibreG * 8) / 10) * 10;
	let energyKj = Number.isFinite(raw.energyKj) && raw.energyKj > 0 ? Math.round(raw.energyKj) : 0;
	if (!energyKj || (estimated && fromMacros && Math.abs(energyKj - fromMacros) / fromMacros > 0.3))
		energyKj = fromMacros;
	// Under 100 kJ or over 10,000 kJ a serve isn't a main meal: a misreading.
	if (energyKj < 100 || energyKj > 10_000) return null;
	return { energyKj, proteinG, carbsG, fatG, sugarsG, fibreG };
}

function nutritionFields(nutrition: ReturnType<typeof tidyNutrition>) {
	const amount = (value: number) => (value > 0 ? String(value) : '0');
	return nutrition
		? {
				energyKj: String(nutrition.energyKj),
				proteinG: amount(nutrition.proteinG),
				carbsG: amount(nutrition.carbsG),
				fatG: amount(nutrition.fatG),
				sugarsG: amount(nutrition.sugarsG),
				fibreG: amount(nutrition.fibreG)
			}
		: { energyKj: '', proteinG: '', carbsG: '', fatG: '', sugarsG: '', fibreG: '' };
}

/** A filled form and which of its fields were estimated (for "About these numbers"). */
interface Read {
	values: RecipeFormValues;
	estimated: Estimate[];
}

function valuesFromAi(recipe: AiRecipe | null): Read | null {
	if (!recipe?.isRecipe) return null;
	const ingredients = recipe.ingredients
		.map(ingredientFromAi)
		.filter((ingredient): ingredient is Ingredient => ingredient !== null);
	const steps = recipe.steps.map((line) => line.trim()).filter(Boolean);
	if (!recipe.title.trim() || ingredients.length === 0 || steps.length === 0) return null;

	// A day at most: anything longer is a misreading.
	const minutes = (value: number) => (value > 0 ? String(Math.min(1440, Math.round(value))) : '');
	const estimatedNutrition = recipe.estimated.includes('nutrition');
	const nutrition = tidyNutrition(recipe.nutrition, estimatedNutrition);
	const proteins = recipe.proteins.filter((protein) =>
		(PROTEIN_OPTIONS as readonly string[]).includes(protein)
	);

	const values: RecipeFormValues = {
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
		ingredients: ingredients.slice(0, 60).map(ingredientLine).join('\n'),
		steps: steps.slice(0, 40).join('\n'),
		notes: recipe.notes.trim().slice(0, 1000),
		...nutritionFields(nutrition)
	};
	return {
		values,
		estimated: recipe.estimated.filter((field) => field !== 'nutrition' || nutrition)
	};
}

const NUTRITION_SYSTEM = `You estimate nutrition per serve for a home recipe, from its ingredients and the number of serves. Work out each ingredient's contribution from its amount (the middle of a range) using typical Australian food composition values (like FSANZ's AUSNUT data), add them up and divide by serves. Count what's eaten, not what's discarded (bones, marinade left behind, most deep-frying oil). Energy to the nearest 10 kJ; grams to one decimal. Check the energy roughly matches the macros (protein and carbs 17 kJ per gram, fat 37, fibre 8). Never answer 0 for a real dish.`;

/**
 * The last step of every import: nutrition filled in if it's still missing (a short second ask
 * from the ingredient lines alone, so it's there even when the page had none or the first ask
 * failed), then the "About these numbers" note saying where it all came from.
 */
async function finish(read: Read, from: string): Promise<RecipeFormValues> {
	let { values, estimated } = read;
	if (!values.energyKj && values.ingredients.trim()) {
		const answer = await askForJson<AiNutrition>({
			system: NUTRITION_SYSTEM,
			content: `Serves ${values.baseServings}.\nIngredients:\n${values.ingredients}`,
			schema: NUTRITION_SCHEMA,
			maxTokens: 400,
			timeoutMs: 20_000
		});
		const nutrition = tidyNutrition(answer, true);
		if (nutrition) {
			values = { ...values, ...nutritionFields(nutrition) };
			estimated = [...new Set([...estimated, 'nutrition' as const])];
		}
	}
	return { ...values, sourceNote: sourceNote(from, estimated) };
}

const askAboutText = async (text: string) =>
	valuesFromAi(
		await askForJson<AiRecipe>({
			model: 'sharp',
			system: SYSTEM,
			content: `Here's the recipe:\n\n${text.slice(0, TEXT_MAX_CHARS)}`,
			schema: RECIPE_SCHEMA,
			maxTokens: 6000,
			timeoutMs: 60_000
		})
	);

/** A recipe page: the tidied structured data (if any) plus the card's text, read together. */
async function askAboutPage(draft: RecipeFormValues | null, text: string) {
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
			model: 'sharp',
			system: SYSTEM,
			content: `${structured}PAGE TEXT:\n${text}`,
			schema: RECIPE_SCHEMA,
			maxTokens: 6000,
			timeoutMs: 60_000
		})
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
		const read = valuesFromAi(
			await askForJson<AiRecipe>({
				model: 'sharp',
				system: SYSTEM,
				content: [photo, textBlock(text || 'Read the recipe in this photo.')],
				schema: RECIPE_SCHEMA,
				maxTokens: 6000,
				timeoutMs: 60_000
			})
		);
		return read
			? { values: await finish(read, 'Read from a photo of the recipe'), source: 'photo' }
			: null;
	}

	const link = linkIn(text);
	if (link) {
		const html = await fetchPage(link);
		if (!html) return null;
		// The page's own recipe data, tidied. On its own it's a decent fill; Claude reads it with
		// the recipe card to tidy the wording and estimate what it lacks (often times, nutrition).
		const from = `Imported from ${link.hostname.replace(/^www\./, '')}`;
		const data = findRecipeData(html);
		const draft = data ? valuesFromRecipeData(data) : null;
		const read =
			(await askAboutPage(draft, pageText(html))) ?? (draft && { values: draft, estimated: [] });
		return read ? { values: await finish(read, from), source: 'link' } : null;
	}

	if (text.length < 20) return null;
	const read = await askAboutText(text);
	return read ? { values: await finish(read, 'Read from pasted text'), source: 'text' } : null;
}
