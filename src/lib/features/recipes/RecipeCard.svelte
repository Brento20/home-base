<script lang="ts">
	/** A recipe in the library: name and your stars, then time and a line of nutrition. */
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { formatMinutes, nutritionLine, type RecipeSummary } from './recipe.js';
	import Stars from './Stars.svelte';

	interface Props {
		recipe: RecipeSummary;
		stars: number | null;
	}

	let { recipe, stars }: Props = $props();
	const nutrition = $derived(nutritionLine(recipe.energyKj, recipe.proteinG));
</script>

<a class="recipe-card" href="/dinner/{recipe.id}">
	<GlassSurface radius={22} squish />
	<span class="body">
		<span class="top">
			<span class="title">{recipe.title}</span>
			{#if stars}<Stars value={stars} size={13} />{/if}
		</span>
		<span class="meta">
			<span class="time"><Icon name="clock" size={14} /> {formatMinutes(recipe.totalMinutes)}</span>
			{#if recipe.isVegetarian}
				<span class="veg" title={recipe.isVegan ? 'Vegan' : 'Vegetarian'}>
					<Icon name="leaf" size={14} />
					<span class="visually-hidden">{recipe.isVegan ? 'Vegan' : 'Vegetarian'}</span>
				</span>
			{/if}
			{#if nutrition}<span class="nutrition">{nutrition}</span>{/if}
		</span>
	</span>
	<span class="chevron"><Icon name="chevron" size={18} /></span>
</a>

<style>
	.recipe-card {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-s);
		border-radius: 22px;
		color: inherit;
		text-decoration: none;
	}

	.body {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
		min-width: 0;
		padding: 16px 0 16px 18px;
	}

	.top {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.title {
		font-size: var(--text-body);
		font-weight: var(--weight-medium);
		line-height: 1.25;
	}

	.meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px 10px;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.time,
	.veg {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.veg {
		color: #b9dca4;
	}

	.nutrition {
		font-variant-numeric: tabular-nums;
	}

	.chevron {
		position: relative;
		z-index: 1;
		padding-right: 14px;
		color: var(--colour-text-faint);
	}
</style>
