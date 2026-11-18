<script lang="ts">
	/**
	 * Add or edit a home recipe. Ingredients one per line ("200 g chicken thigh, sliced"), steps
	 * one per line. Nutrition is optional and tucked behind a chip, like a plan's place and note.
	 */
	import { enhance } from '$app/forms';
	import { RECIPE_TITLE } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	import Icon from '#lib/ui/Icon.svelte';
	import { proteinLabel } from './recipe.js';

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
	}

	interface Props {
		values: RecipeFormValues;
		errors?: Partial<Record<string, string>>;
		submitLabel: string;
		cancelHref: string;
	}

	let { values, errors = {}, submitLabel, cancelHref }: Props = $props();

	const PROTEINS = [
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
	];
	const nutritionOpen = $derived(Boolean(values.energyKj || values.proteinG || errors.nutrition));
	let saving = $state(false);
</script>

<form
	method="POST"
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
		<label class="field">
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
			placeholder={'One per line, for the servings above:\n200 g chicken thigh, sliced\n1 tsp ground cumin\n2 garlic cloves, crushed\nSalt, to taste'}
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
			placeholder={'One step per line:\nBrown the chicken in a hot pan.\nAdd the spices and cook until fragrant.'}
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

	<fieldset class="field">
		<legend class="field-label">Protein (optional)</legend>
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

	<label class="field">
		<span class="field-label">Cuisine (optional)</span>
		<input
			class="field-input"
			name="cuisine"
			maxlength="60"
			value={values.cuisine}
			placeholder="Italian"
		/>
	</label>

	<label class="field">
		<span class="field-label">Anything to know? (optional)</span>
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

	<div class="extras">
		<input class="extra-toggle" type="checkbox" id="recipe-add-nutrition" checked={nutritionOpen} />
		<label class="extra-chip" for="recipe-add-nutrition"
			><Icon name="plus" size={16} /> Nutrition</label
		>
	</div>

	<div class="form-actions">
		<a class="button-quiet" href={cancelHref}>Cancel</a>
		<button class="button-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
	</div>
</form>

<style>
	.numbers {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
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
		animation: extra-in 320ms var(--ease-out);
	}

	.recipe-form:has(#recipe-add-nutrition:not(:checked)) .nutrition,
	.extra-toggle:checked + .extra-chip,
	.recipe-form:has(#recipe-add-nutrition:checked) .extras {
		display: none;
	}

	.extra-toggle {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.extra-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 40px;
		padding: 0 16px 0 12px;
		border: 1px solid rgb(255 255 255 / 0.14);
		border-radius: var(--radius-pill);
		background: rgb(255 255 255 / 0.05);
		color: var(--colour-text-muted);
		font-size: var(--text-small);
		cursor: pointer;
	}

	@keyframes extra-in {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
	}
</style>
