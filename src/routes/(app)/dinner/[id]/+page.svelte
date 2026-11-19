<script lang="ts">
	import IngredientList from '#lib/features/recipes/IngredientList.svelte';
	import MethodSteps from '#lib/features/recipes/MethodSteps.svelte';
	import NutritionGrid from '#lib/features/recipes/NutritionGrid.svelte';
	import RecipeRatings from '#lib/features/recipes/RecipeRatings.svelte';
	import {
		cuisineLabel,
		DEFAULT_SERVINGS,
		formatMinutes,
		NUTRITION_CREDIT,
		scaleIngredients
	} from '#lib/features/recipes/recipe.js';
	import ScheduleForm from '#lib/features/recipes/ScheduleForm.svelte';
	import ServingsStepper from '#lib/features/recipes/ServingsStepper.svelte';
	import ShoppingForm from '#lib/features/recipes/ShoppingForm.svelte';
	import ActionDock from '#lib/ui/ActionDock.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';
	import { formatDinnerWhen } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const recipe = $derived(data.recipe);
	let servings = $state(DEFAULT_SERVINGS);
	const ingredients = $derived(scaleIngredients(recipe, servings));

	// Cuisine and diet as one quiet line under the title.
	const kind = $derived(
		[
			[cuisineLabel(recipe.cuisine), false],
			[recipe.isVegan ? 'Vegan' : recipe.isVegetarian ? 'Vegetarian' : null, true]
		].filter(([label]) => label) as [string, boolean][]
	);

	const times = $derived(
		[
			['Prep', recipe.prepMinutes],
			['Cook', recipe.cookMinutes],
			['Rest', recipe.restMinutes]
		].filter(([, minutes]) => Number(minutes) > 0) as [string, number][]
	);

	let sheet = $state<'shop' | 'schedule' | null>(null);
	let notice = $state<{ text: string; href: string; link: string } | null>(null);
	let noticeTimer: ReturnType<typeof setTimeout> | undefined;

	function announce(text: string, href: string, link: string) {
		sheet = null;
		notice = { text, href, link };
		clearTimeout(noticeTimer);
		noticeTimer = setTimeout(() => (notice = null), 6000);
	}

	function shopped(result: Record<string, unknown> | undefined) {
		const count = Number(result?.count ?? 0);
		announce(
			`Added ${count} ${count === 1 ? 'thing' : 'things'} to Lists`,
			`/lists/${result?.listId}`,
			'Open list'
		);
	}

	function scheduled(result: Record<string, unknown> | undefined) {
		const cook = data.household.members.find((person) => person.id === result?.assigneeId);
		const when = formatDinnerWhen(
			String(result?.dueOn),
			(result?.dueTime as string) ?? null,
			data.today
		);
		announce(
			`${when}${cook ? ` · ${cook.id === data.me.id ? 'You’re' : `${cook.displayName}’s`} cooking` : ''}`,
			`/dinner/cook/${result?.taskId}`,
			'View'
		);
	}
</script>

<svelte:head>
	<title>{recipe.title} · home base</title>
</svelte:head>

<PageHeader title={recipe.title}>
	{#snippet lead()}
		<a class="button-quiet" href="/dinner"><Icon name="back" size={18} /> Dinner</a>
	{/snippet}
	{#snippet trailing()}
		{#if recipe.custom}<a class="button-edit" href="/dinner/{recipe.id}/edit">Edit</a>{/if}
	{/snippet}
</PageHeader>

<div class="detail">
	<section class="facts" aria-label="About this recipe">
		{#if kind.length}
			<p class="kind">
				{#each kind as [label, green] (label)}<span class:green>{label}</span>{/each}
			</p>
		{/if}
		<dl class="times">
			{#each times as [label, minutes] (label)}
				<div>
					<dt>{label}</dt>
					<dd>{formatMinutes(minutes)}</dd>
				</div>
			{/each}
			<div class="total">
				<dt>Total</dt>
				<dd>{formatMinutes(recipe.totalMinutes)}</dd>
			</div>
		</dl>
	</section>

	<section aria-labelledby="ingredients">
		<h2 id="ingredients">
			Ingredients <span class="for">for {servings} {servings === 1 ? 'serve' : 'serves'}</span>
		</h2>
		<IngredientList {ingredients} />
	</section>

	<section aria-labelledby="method">
		<h2 id="method">Method</h2>
		<MethodSteps steps={recipe.steps} />
	</section>

	{#if recipe.tips.length}
		<section aria-labelledby="tips">
			<h2 id="tips">Good to know</h2>
			<ul class="tips">
				{#each recipe.tips as tip (tip)}<li>{tip}</li>{/each}
			</ul>
		</section>
	{/if}

	{#if recipe.nutrition}
		<section aria-labelledby="nutrition">
			<h2 id="nutrition">Per serve</h2>
			<NutritionGrid nutrition={recipe.nutrition} />
			{#if !recipe.custom || recipe.nutritionNote}
				<details class="small-print">
					<summary>About these numbers</summary>
					<p>
						{recipe.custom
							? recipe.nutritionNote
							: `${NUTRITION_CREDIT}${recipe.nutritionNote ? ` ${recipe.nutritionNote}` : ''}`}
					</p>
				</details>
			{/if}
		</section>
	{/if}

	<section aria-labelledby="ratings">
		<h2 id="ratings">Ratings</h2>
		<RecipeRatings
			title={recipe.title}
			ratings={data.ratings}
			people={data.household.members}
			meId={data.me.id}
		/>
	</section>

	{#if recipe.custom}
		<ConfirmDelete action="?/delete" label="Delete recipe" />
	{/if}
</div>

<!-- Servings and the two things you can do with them, above the tab bar. -->
<ActionDock>
	{#snippet above()}
		{#if notice}
			<div class="notice" role="status">
				<Icon name="check" size={18} />
				<span>{notice.text}</span>
				<a href={notice.href}>{notice.link}</a>
			</div>
		{/if}
	{/snippet}
	<ServingsStepper bind:value={servings} />
	<button type="button" class="button-secondary act" onclick={() => (sheet = 'shop')}>
		Add to Lists
	</button>
	<button type="button" class="button-primary act" onclick={() => (sheet = 'schedule')}>
		Schedule
	</button>
</ActionDock>

<Sheet open={sheet === 'shop'} title="Add to Lists" onclose={() => (sheet = null)}>
	{#key servings}
		<ShoppingForm {recipe} {servings} onsaved={shopped} />
	{/key}
</Sheet>

<Sheet open={sheet === 'schedule'} title="Schedule dinner" onclose={() => (sheet = null)}>
	<ScheduleForm
		action="?/schedule"
		people={data.household.members}
		today={data.today}
		hidden={{ servings }}
		values={{ assigneeId: data.me.id }}
		submitLabel="Schedule {servings} {servings === 1 ? 'serve' : 'serves'}"
		onsaved={scheduled}
	/>
</Sheet>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
		/* Room for the action bar above the tab bar. */
		padding-bottom: 84px;
	}

	h2 {
		margin: 0 0 var(--space-m);
		font-size: var(--text-body);
		font-weight: var(--weight-strong);
	}

	.for {
		margin-left: 6px;
		font-weight: var(--weight-regular, 400);
		color: var(--colour-text-muted);
		font-size: var(--text-small);
	}

	.facts {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
		margin-top: calc(-1 * var(--space-s));
	}

	.kind {
		margin: calc(-1 * var(--space-s)) 0 0;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.green {
		color: #b9dca4;
	}

	.kind span + span::before {
		content: ' · ';
		color: var(--colour-text-muted);
	}

	.times {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-l);
		margin: 0;
	}

	.times div {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.times dt {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.times dd {
		margin: 0;
		font-weight: var(--weight-medium);
		font-variant-numeric: tabular-nums;
	}

	.small-print {
		margin-top: var(--space-m);
		font-size: var(--text-caption);
		line-height: 1.45;
		color: var(--colour-text-faint);
	}

	.small-print summary {
		width: fit-content;
		padding: 6px 0;
		color: var(--colour-text-muted);
		cursor: pointer;
	}

	.small-print p {
		margin: var(--space-xs) 0 0;
	}

	.tips {
		margin: 0;
		padding-left: 1.2em;
		color: var(--colour-text-muted);
		font-size: var(--text-small);
	}

	.tips li + li {
		margin-top: 6px;
	}

	/* The column's gap already spaces it. */
	.detail > :global(.confirm-delete) {
		margin-top: 0;
	}

	/* The two actions share the bar's width after the stepper. */
	.act {
		flex: 1;
		min-width: 0;
	}

	.notice {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 46px;
		padding: 0 8px 0 16px;
		border-radius: var(--radius-pill);
		background: rgb(36 30 26 / 0.98);
		box-shadow:
			inset 0 0 0 1px rgb(255 255 255 / 0.1),
			0 10px 28px -12px rgb(0 0 0 / 0.7);
		font-size: var(--text-small);
		animation: notice-in 360ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.notice :global(svg) {
		color: var(--colour-accent);
	}

	.notice span {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.notice a {
		padding: 8px 12px;
		border-radius: var(--radius-pill);
		color: var(--colour-accent);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	@keyframes notice-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
</style>
