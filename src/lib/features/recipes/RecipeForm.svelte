<script lang="ts">
	/**
	 * Add or edit a home recipe. Ingredients one per line ("200 g chicken thigh, sliced"), steps
	 * one per line. Rest time, protein, cuisine, a note and nutrition are optional and tucked
	 * behind chips, like a plan's place and note, so the form starts short.
	 */
	import { enhance } from '$app/forms';
	import { RECIPE_TITLE } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	import Icon from '#lib/ui/Icon.svelte';
	import { PROTEIN_OPTIONS as PROTEINS, proteinLabel, type RecipeFormValues } from './recipe.js';

	interface Props {
		values: RecipeFormValues;
		errors?: Partial<Record<string, string>>;
		submitLabel: string;
		/** Where it posts: '?/create' on Add a recipe, which also has the import action. */
		action?: string;
	}

	let { values, errors = {}, submitLabel, action }: Props = $props();

	const INGREDIENTS_EXAMPLE = [
		'One per line, for the servings above:',
		'200 g chicken thigh, sliced',
		'1 tsp ground cumin',
		'2 garlic cloves, crushed',
		'Salt, to taste'
	].join('\n');
	const STEPS_EXAMPLE = [
		'One step per line:',
		'Brown the chicken in a hot pan.',
		'Add the spices and cook until fragrant.'
	].join('\n');

	// Optional fields that already hold something start open.
	const open = $derived({
		rest: Boolean(values.restMinutes && values.restMinutes !== '0'),
		protein: values.proteins.length > 0,
		cuisine: Boolean(values.cuisine),
		notes: Boolean(values.notes),
		nutrition: Boolean(values.energyKj || values.proteinG || errors.nutrition)
	});
	const EXTRAS = [
		['rest', 'Rest time'],
		['protein', 'Protein'],
		['cuisine', 'Cuisine'],
		['notes', 'Note'],
		['nutrition', 'Nutrition']
	] as const;
	let saving = $state(false);
</script>

<form
	method="POST"
	{action}
	class="form-stack recipe-form"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<label class="field">
		<span class="field-label">What’s it called?</span>
		<input
			id="recipe-title"
			class="field-input"
			name="title"
			value={values.title}
			maxlength="120"
			required
			placeholder={RECIPE_TITLE[0]}
			use:placeholderReel={RECIPE_TITLE}
			aria-invalid={errors.title ? 'true' : undefined}
		/>
		{#if errors.title}<span class="field-error">{errors.title}</span>{/if}
	</label>

	<div class="field-row numbers">
		<label class="field">
			<span class="field-label">Serves</span>
			<input
				class="field-input"
				name="baseServings"
				type="number"
				inputmode="numeric"
				min="1"
				max="12"
				value={values.baseServings}
			/>
		</label>
		<label class="field">
			<span class="field-label">Prep (min)</span>
			<input
				class="field-input"
				name="prepMinutes"
				type="number"
				inputmode="numeric"
				min="0"
				value={values.prepMinutes}
			/>
		</label>
		<label class="field">
			<span class="field-label">Cook (min)</span>
			<input
				class="field-input"
				name="cookMinutes"
				type="number"
				inputmode="numeric"
				min="0"
				value={values.cookMinutes}
			/>
		</label>
	</div>
	{#if errors.baseServings || errors.minutes}
		<span class="field-error">{errors.baseServings ?? errors.minutes}</span>
	{/if}

	<label class="field">
		<span class="field-label">What goes in?</span>
		<textarea
			class="field-input"
			name="ingredients"
			rows="7"
			placeholder={INGREDIENTS_EXAMPLE}
			aria-invalid={errors.ingredients ? 'true' : undefined}>{values.ingredients}</textarea
		>
		<span class="field-hint"
			>Amounts first (g, kg, ml, L, tsp, tbsp, cup), so they scale with servings.</span
		>
		{#if errors.ingredients}<span class="field-error">{errors.ingredients}</span>{/if}
	</label>

	<label class="field">
		<span class="field-label">How’s it made?</span>
		<textarea
			class="field-input"
			name="steps"
			rows="7"
			placeholder={STEPS_EXAMPLE}
			aria-invalid={errors.steps ? 'true' : undefined}>{values.steps}</textarea
		>
		<span class="field-hint"
			>Say “half the stock” rather than an amount, so it reads right at any serving count.</span
		>
		{#if errors.steps}<span class="field-error">{errors.steps}</span>{/if}
	</label>

	<fieldset class="field">
		<legend class="field-label">Suits</legend>
		<div class="choice-pills">
			<label class="choice-pill">
				<input type="checkbox" name="isVegetarian" checked={values.isVegetarian} />
				<Icon name="leaf" size={14} /> Vegetarian
			</label>
			<label class="choice-pill">
				<input type="checkbox" name="isVegan" checked={values.isVegan} />
				<Icon name="leaf" size={14} /> Vegan
			</label>
		</div>
	</fieldset>

	<label class="field extra rest short">
		<span class="field-label">Rest (min)</span>
		<input
			class="field-input"
			name="restMinutes"
			type="number"
			inputmode="numeric"
			min="0"
			value={values.restMinutes}
		/>
	</label>

	<fieldset class="field extra protein">
		<legend class="field-label">Protein</legend>
		<div class="choice-pills">
			{#each PROTEINS as protein (protein)}
				<label class="choice-pill">
					<input
						type="checkbox"
						name="proteins"
						value={protein}
						checked={values.proteins.includes(protein)}
					/>
					{proteinLabel(protein)}
				</label>
			{/each}
		</div>
	</fieldset>

	<label class="field extra cuisine">
		<span class="field-label">Cuisine</span>
		<input
			class="field-input"
			name="cuisine"
			maxlength="60"
			value={values.cuisine}
			placeholder="Italian"
		/>
	</label>

	<label class="field extra notes">
		<span class="field-label">Anything to know?</span>
		<textarea class="field-input" name="notes" rows="2" maxlength="1000" placeholder="Freezes well"
			>{values.notes}</textarea
		>
	</label>

	<div class="extra nutrition">
		<span class="field-label">Per serve</span>
		<div class="field-row three">
			<label class="field"
				><span class="field-hint">Energy (kJ)</span><input
					class="field-input"
					name="energyKj"
					inputmode="decimal"
					value={values.energyKj}
				/></label
			>
			<label class="field"
				><span class="field-hint">Protein (g)</span><input
					class="field-input"
					name="proteinG"
					inputmode="decimal"
					value={values.proteinG}
				/></label
			>
			<label class="field"
				><span class="field-hint">Carbs (g)</span><input
					class="field-input"
					name="carbsG"
					inputmode="decimal"
					value={values.carbsG}
				/></label
			>
			<label class="field"
				><span class="field-hint">Fat (g)</span><input
					class="field-input"
					name="fatG"
					inputmode="decimal"
					value={values.fatG}
				/></label
			>
			<label class="field"
				><span class="field-hint">Sugars (g)</span><input
					class="field-input"
					name="sugarsG"
					inputmode="decimal"
					value={values.sugarsG}
				/></label
			>
			<label class="field"
				><span class="field-hint">Fibre (g)</span><input
					class="field-input"
					name="fibreG"
					inputmode="decimal"
					value={values.fibreG}
				/></label
			>
		</div>
		{#if errors.nutrition}<span class="field-error">{errors.nutrition}</span>{/if}
	</div>

	<!-- No name on these: they only show and hide fields, and aren't sent with the form. -->
	<div class="extras">
		{#each EXTRAS as [key, label] (key)}
			<input class="extra-toggle" type="checkbox" id="recipe-add-{key}" checked={open[key]} />
			<label class="extra-chip" for="recipe-add-{key}"><Icon name="plus" size={16} /> {label}</label
			>
		{/each}
	</div>

	{#if values.sourceNote}
		<!-- Kept with the recipe and shown under "About these numbers". -->
		<input type="hidden" name="sourceNote" value={values.sourceNote} />
		<p class="source-note">
			<strong>About these numbers</strong>
			{values.sourceNote}
		</p>
	{/if}

	<div class="form-actions">
		<button class="button-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
	</div>
</form>

<style>
	.numbers {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}

	.numbers .field-label {
		white-space: nowrap;
		font-size: var(--text-caption);
	}

	.three {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}

	.extra {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
	}

	.source-note {
		margin: 0;
		font-size: var(--text-caption);
		line-height: 1.45;
		color: var(--colour-text-faint);
	}

	.source-note strong {
		display: block;
		margin-bottom: 2px;
		color: var(--colour-text-muted);
		font-weight: var(--weight-medium);
	}

	.short {
		max-width: calc((100% - 16px) / 3);
	}

	/* Optional fields stay tucked away until their chip is tapped (chip styles: forms.css). */
	.recipe-form:has(#recipe-add-rest:not(:checked)) .rest,
	.recipe-form:has(#recipe-add-protein:not(:checked)) .protein,
	.recipe-form:has(#recipe-add-cuisine:not(:checked)) .cuisine,
	.recipe-form:has(#recipe-add-notes:not(:checked)) .notes,
	.recipe-form:has(#recipe-add-nutrition:not(:checked)) .nutrition,
	.recipe-form:not(:has(.extra-toggle:not(:checked))) .extras {
		display: none;
	}
</style>
