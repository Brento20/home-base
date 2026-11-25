<script lang="ts">
	/**
	 * Turns a recipe into a shopping list: every ingredient at the chosen servings, ticked to
	 * add. Untick what's already in the cupboard (salt and the like start unticked).
	 */
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { enhance } from '$app/forms';
	import { describeIngredient, isPantryStaple, scaleIngredients, type Recipe } from './recipe.js';

	interface Props {
		recipe: Recipe;
		servings: number;
		onsaved: (data: Record<string, unknown> | undefined) => void;
	}

	let { recipe, servings, onsaved }: Props = $props();

	const scaled = $derived(scaleIngredients(recipe, servings));
	// Indexes of the ingredients to add; starts with everything but the pantry staples. The
	// sheet remakes this form whenever the servings change, so reading the recipe once is right.
	const chosen = new SvelteSet<number>(
		untrack(() =>
			recipe.ingredients.flatMap((ingredient, index) => (isPantryStaple(ingredient) ? [] : [index]))
		)
	);

	function toggle(index: number, on: boolean) {
		if (on) chosen.add(index);
		else chosen.delete(index);
	}

	let saving = $state(false);
</script>

<form
	method="POST"
	action="?/shop"
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') onsaved(result.data);
			await update({ reset: false, invalidateAll: false });
		};
	}}
>
	<input type="hidden" name="servings" value={servings} />
	<p class="intro">
		A new list called <strong>{recipe.title}</strong>, for {servings}
		{servings === 1 ? 'serve' : 'serves'}. Untick anything you’ve already got.
	</p>

	<ul class="items">
		{#each scaled as ingredient, index (index)}
			{@const line = describeIngredient(ingredient)}
			<li>
				<label class="item" data-press>
					<input
						class="hidden-input"
						type="checkbox"
						name="ingredient"
						value={index}
						checked={chosen.has(index)}
						onchange={(event) => toggle(index, event.currentTarget.checked)}
					/>
					<span class="tick" aria-hidden="true"></span>
					<span class="name">{line.name}</span>
					<span class="amount">{line.amount}</span>
				</label>
			</li>
		{/each}
	</ul>

	<button class="button-primary button-block" disabled={saving || chosen.size === 0}>
		{saving
			? 'Adding…'
			: chosen.size === 0
				? 'Nothing to add'
				: `Add ${chosen.size} ${chosen.size === 1 ? 'thing' : 'things'} to Lists`}
	</button>
</form>

<style>
	.intro {
		margin: 0 0 var(--space-m);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.intro strong {
		color: var(--colour-text);
		font-weight: var(--weight-medium);
	}

	.items {
		margin: 0 0 var(--space-l);
		padding: 0;
		list-style: none;
	}

	.item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 48px;
		border-bottom: var(--hairline) solid var(--colour-separator);
		cursor: pointer;
		transition: opacity var(--duration-quick) var(--ease-out);
	}

	.tick {
		flex: none;
		width: 22px;
		height: 22px;
		border: 2px solid var(--colour-hairline-strong);
		border-radius: 50%;
		transition:
			background-color var(--duration-quick) var(--ease-out),
			border-color var(--duration-quick) var(--ease-out),
			transform var(--duration-release) var(--spring-gentle);
	}

	.item:has(input:checked) .tick {
		border-color: var(--colour-accent);
		background: var(--colour-accent)
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2314100d' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E")
			center / 14px no-repeat;
	}

	.item:global([data-pressed]) .tick {
		transform: scale(0.86);
		transition-duration: var(--duration-press);
	}

	.item:has(input:not(:checked)) .name,
	.item:has(input:not(:checked)) .amount {
		color: var(--colour-text-faint);
		text-decoration: line-through;
		text-decoration-color: var(--colour-fill-stronger);
	}

	.item:has(input:focus-visible) {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}

	.name {
		flex: 1;
		min-width: 0;
	}

	.amount {
		color: var(--colour-text-muted);
		font-size: var(--text-small);
		font-variant-numeric: tabular-nums;
	}
</style>
