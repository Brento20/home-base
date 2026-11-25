<script lang="ts">
	/**
	 * A recipe row in the library: the home's photo of it (or a quiet bowl when there isn't one),
	 * the name and your stars, then one quiet line of time, diet and nutrition. Rows sit in one
	 * list with hairlines between them, like the rest of the app's lists.
	 */
	import Icon from '#lib/ui/Icon.svelte';
	import { formatMinutes, type RecipeSummary } from './recipe.js';
	import Stars from './Stars.svelte';

	interface Props {
		recipe: RecipeSummary;
		stars: number | null;
	}

	let { recipe, stars }: Props = $props();
	const diet = $derived(recipe.isVegan ? 'Vegan' : recipe.isVegetarian ? 'Vegetarian' : null);
	// Short enough for one line on a phone; the recipe page says it's per serve.
	const nutrition = $derived(
		recipe.energyKj !== null && recipe.proteinG !== null
			? `${recipe.energyKj.toLocaleString('en-AU')} kJ · ${Math.round(recipe.proteinG)} g protein`
			: null
	);
</script>

<a class="recipe-row" href="/dinner/{recipe.id}">
	{#if recipe.photoUrl}
		<img class="thumb" src={recipe.photoUrl} alt="" loading="lazy" decoding="async" />
	{:else}
		<span class="thumb empty" aria-hidden="true"><Icon name="dinner" size={22} /></span>
	{/if}
	<span class="body">
		<span class="top">
			<span class="title">{recipe.title}</span>
			{#if stars}<Stars value={stars} size={12} />{/if}
		</span>
		<span class="meta">
			<span>{formatMinutes(recipe.totalMinutes)}</span>
			{#if diet}<span class="diet">{diet}</span>{/if}
		</span>
		<!-- Its own line: beside the photo there isn't room for all of it on one. -->
		{#if nutrition}<span class="meta">{nutrition}</span>{/if}
	</span>
	<Icon name="chevron" size={18} />
</a>

<style>
	.recipe-row {
		display: flex;
		align-items: center;
		gap: var(--space-m);
		min-height: 64px;
		padding: 10px 0;
		border-bottom: var(--hairline) solid var(--colour-separator);
		color: inherit;
		text-decoration: none;
		transition: opacity var(--duration-quick) var(--ease-out);
	}

	.recipe-row:global([data-pressed]) {
		opacity: 0.6;
		transition-duration: var(--duration-press);
	}

	.thumb {
		flex: none;
		width: 56px;
		height: 56px;
		border-radius: 14px;
		object-fit: cover;
		background: var(--colour-fill);
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
	}

	.thumb.empty {
		display: grid;
		place-items: center;
		color: var(--colour-text-faint);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.top {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.title {
		min-width: 0;
		font-size: var(--text-body);
		line-height: 1.3;
	}

	.top :global(.stars) {
		flex: none;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		font-size: var(--text-caption);
		line-height: 1.35;
		color: var(--colour-text-muted);
		font-variant-numeric: tabular-nums;
	}

	/* Spaces around the dot are part of the content, so whitespace handling can't drop them. */
	.meta > span + span::before {
		content: '\00a0·\00a0';
		color: var(--colour-text-muted);
	}

	.diet {
		color: var(--colour-veg);
	}

	.recipe-row > :global(svg) {
		flex: none;
		color: var(--colour-text-faint);
	}
</style>
