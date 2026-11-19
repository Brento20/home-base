<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { EMPTY, HEADINGS, RECIPE_SEARCH } from '#lib/copy/voice.js';
	import DinnerPrompt from '#lib/features/recipes/DinnerPrompt.svelte';
	import RecipeCard from '#lib/features/recipes/RecipeCard.svelte';
	import {
		FAVOURITE_STARS,
		filterOptions,
		filterRecipes,
		NO_FILTERS,
		proteinLabel,
		type RecipeFilters
	} from '#lib/features/recipes/recipe.js';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	import RoundButton from '#lib/ui/RoundButton.svelte';
	import type { Snapshot } from './$types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const heading = pick(HEADINGS.dinner);
	const empty = pick(EMPTY.recipes);

	let filters = $state<RecipeFilters>({ ...NO_FILTERS });
	let moreOpen = $state(false);

	const results = $derived(filterRecipes(data.recipes, filters, data.myStars));
	const options = $derived(filterOptions(data.recipes));
	const filtering = $derived(
		filters.quick ||
			filters.vegetarian ||
			filters.vegan ||
			filters.favourites ||
			filters.cuisine !== null ||
			filters.protein !== null
	);
	const extraCount = $derived(Number(filters.cuisine !== null) + Number(filters.protein !== null));

	const QUICK_CHIPS = [
		['quick', 'Under 30 min'],
		['vegetarian', 'Vegetarian'],
		['vegan', 'Vegan'],
		['favourites', 'Favourites']
	] as const;

	// Coming back from a recipe keeps your search and filters.
	export const snapshot: Snapshot<{ filters: RecipeFilters; moreOpen: boolean }> = {
		capture: () => ({ filters: $state.snapshot(filters), moreOpen }),
		restore: (saved) => {
			filters = saved.filters;
			moreOpen = saved.moreOpen;
		}
	};
</script>

<svelte:head>
	<title>Plan dinner · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/"><Icon name="back" size={18} /> Today</a>
	{/snippet}
	{#snippet action()}
		<RoundButton icon="plus" label="Add a recipe" href="/dinner/new" />
	{/snippet}
</PageHeader>

{#if data.prompt}
	{#key `${data.prompt.kind}-${data.prompt.task.id}`}
		<DinnerPrompt
			kind={data.prompt.kind}
			task={data.prompt.task}
			stars={data.prompt.stars}
			people={data.household.members}
			meId={data.me.id}
			today={data.today}
		/>
	{/key}
{/if}

<div class="finder">
	<label class="search">
		<Icon name="search" size={20} />
		<span class="visually-hidden">Search recipes by dish or ingredient</span>
		<input
			class="field-input"
			type="search"
			enterkeyhint="search"
			autocomplete="off"
			bind:value={filters.query}
			placeholder={RECIPE_SEARCH[0]}
			use:placeholderReel={RECIPE_SEARCH}
		/>
		{#if filters.query}
			<button
				type="button"
				class="clear"
				aria-label="Clear search"
				onclick={() => (filters.query = '')}
			>
				<Icon name="close" size={16} />
			</button>
		{/if}
	</label>

	<div class="chips quick" role="group" aria-label="Filters">
		{#each QUICK_CHIPS as [key, label] (key)}
			<button
				type="button"
				class="chip"
				aria-pressed={filters[key]}
				onclick={() => (filters[key] = !filters[key])}
			>
				{#if key === 'favourites'}<Icon name="star" size={14} filled={filters.favourites} />{/if}
				{label}
			</button>
		{/each}
		<button
			type="button"
			class="chip more"
			aria-expanded={moreOpen}
			aria-controls="more-filters"
			onclick={() => (moreOpen = !moreOpen)}
		>
			<Icon name="filter" size={15} />
			More filters{extraCount ? ` · ${extraCount}` : ''}
		</button>
	</div>

	{#if moreOpen}
		<div class="more-filters" id="more-filters">
			<div class="group" role="group" aria-labelledby="cuisine-label">
				<span class="group-label" id="cuisine-label">Cuisine</span>
				<div class="chips">
					{#each options.cuisines as cuisine (cuisine)}
						<button
							type="button"
							class="chip"
							aria-pressed={filters.cuisine === cuisine}
							onclick={() => (filters.cuisine = filters.cuisine === cuisine ? null : cuisine)}
						>
							{cuisine}
						</button>
					{/each}
				</div>
			</div>
			<div class="group" role="group" aria-labelledby="protein-label">
				<span class="group-label" id="protein-label">Protein</span>
				<div class="chips">
					{#each options.proteins as protein (protein)}
						<button
							type="button"
							class="chip"
							aria-pressed={filters.protein === protein}
							onclick={() => (filters.protein = filters.protein === protein ? null : protein)}
						>
							{proteinLabel(protein)}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<p class="count" aria-live="polite">
	{#if filters.query || filtering}
		{results.length}
		{results.length === 1 ? 'match' : 'matches'}
		{#if filtering}
			<button
				type="button"
				class="reset"
				onclick={() => (filters = { ...NO_FILTERS, query: filters.query })}
			>
				Clear filters
			</button>
		{/if}
	{:else}
		{data.recipes.length} recipes
	{/if}
</p>

{#if results.length}
	<ul class="recipes">
		{#each results as recipe (recipe.id)}
			<li><RecipeCard {recipe} stars={data.myStars[recipe.id] ?? null} /></li>
		{/each}
	</ul>
{:else}
	<p class="empty">
		{filters.favourites && !Object.values(data.myStars).some((stars) => stars >= FAVOURITE_STARS)
			? 'Give a recipe five stars and it’ll live here.'
			: empty}
	</p>
{/if}

<style>
	.finder {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
	}

	.search {
		position: relative;
		display: block;
		color: var(--colour-text-muted);
	}

	.search > :global(svg) {
		position: absolute;
		top: 50%;
		left: 16px;
		z-index: 1;
		transform: translateY(-50%);
		pointer-events: none;
	}

	.search input {
		width: 100%;
		padding-left: 46px;
		padding-right: 44px;
		-webkit-appearance: none;
		appearance: none;
	}

	.search input::-webkit-search-cancel-button {
		display: none;
	}

	.clear {
		position: absolute;
		top: 50%;
		right: 8px;
		z-index: 1;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		transform: translateY(-50%);
		border: 0;
		border-radius: 50%;
		background: rgb(255 255 255 / 0.08);
		color: var(--colour-text-muted);
	}
	/* A bigger tap area than the little circle shows. */
	.clear::after {
		content: '';
		position: absolute;
		inset: -6px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	/* The main filters stay on one line and scroll sideways, edge to edge. */
	.chips.quick {
		flex-wrap: nowrap;
		margin-inline: calc(-1 * var(--page-gutter));
		padding-inline: var(--page-gutter);
		overflow-x: auto;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
	}

	.chips.quick::-webkit-scrollbar {
		display: none;
	}

	.chip {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: var(--tap-target);
		padding: 0 14px;
		border: 1px solid var(--colour-hairline-strong);
		border-radius: var(--radius-pill);
		background: none;
		color: var(--colour-text-muted);
		font-size: var(--text-small);
		transition:
			background-color var(--duration-quick) var(--ease-out),
			color var(--duration-quick) var(--ease-out),
			border-color var(--duration-quick) var(--ease-out),
			transform var(--duration-release) var(--spring-gentle);
	}

	.chip[aria-pressed='true'] {
		border-color: var(--colour-accent-edge);
		background: var(--colour-accent-soft);
		color: var(--colour-text);
	}

	.chip[aria-pressed='true'] :global(svg) {
		color: var(--colour-accent);
	}

	.chip:global([data-pressed]) {
		transform: scale(0.95);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}

	.more[aria-expanded='true'] {
		color: var(--colour-text);
		border-color: rgb(255 255 255 / 0.24);
	}

	.more-filters {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
		padding: var(--space-m);
		border-radius: 22px;
		background: rgb(255 255 255 / 0.03);
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
		animation: open-down 320ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
	}

	.group-label {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.count {
		display: flex;
		align-items: center;
		gap: 4px;
		margin: var(--space-l) 0 0;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.reset {
		margin-left: auto;
		padding: 6px 4px;
		border: 0;
		background: none;
		color: var(--colour-accent);
		font-size: var(--text-caption);
	}

	.recipes {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.empty {
		margin: var(--space-l) 0;
		color: var(--colour-text-muted);
	}

	@keyframes open-down {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
	}
</style>
