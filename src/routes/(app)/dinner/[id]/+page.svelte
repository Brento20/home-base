<script lang="ts">
	import { enhance } from '$app/forms';
	import IngredientList from '#lib/features/recipes/IngredientList.svelte';
	import MethodSteps from '#lib/features/recipes/MethodSteps.svelte';
	import {
		cuisineLabel,
		DEFAULT_SERVINGS,
		formatMinutes,
		NUTRITION_CREDIT,
		scaleIngredients,
		SERVINGS_MAX,
		SERVINGS_MIN
	} from '#lib/features/recipes/recipe.js';
	import ScheduleForm from '#lib/features/recipes/ScheduleForm.svelte';
	import ShoppingForm from '#lib/features/recipes/ShoppingForm.svelte';
	import Stars from '#lib/features/recipes/Stars.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
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

	const times = $derived(
		[
			['Prep', recipe.prepMinutes],
			['Cook', recipe.cookMinutes],
			['Rest', recipe.restMinutes]
		].filter(([, minutes]) => Number(minutes) > 0) as [string, number][]
	);

	const ratingFor = (profileId: string) =>
		data.ratings.find((rating) => rating.profileId === profileId)?.stars ?? null;
	const others = $derived(data.household.members.filter((person) => person.id !== data.me.id));

	const nutrition = $derived(
		recipe.nutrition
			? [
					['Protein', recipe.nutrition.proteinG],
					['Carbs', recipe.nutrition.carbsG],
					['Fat', recipe.nutrition.fatG],
					['Sugars', recipe.nutrition.sugarsG],
					['Fibre', recipe.nutrition.fibreG]
				].filter(([, grams]) => grams !== null)
			: []
	);
	const grams = (value: unknown) =>
		`${Number(value).toLocaleString('en-AU', { maximumFractionDigits: 1 })} g`;

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
	{#snippet action()}
		{#if recipe.custom}<a class="button-quiet" href="/dinner/{recipe.id}/edit">Edit</a>{/if}
	{/snippet}
</PageHeader>

<div class="detail">
	<section class="facts" aria-label="About this recipe">
		<div class="tags">
			{#if recipe.cuisine}<span class="tag">{cuisineLabel(recipe.cuisine)}</span>{/if}
			{#if recipe.isVegan}
				<span class="tag green"><Icon name="leaf" size={14} /> Vegan</span>
			{:else if recipe.isVegetarian}
				<span class="tag green"><Icon name="leaf" size={14} /> Vegetarian</span>
			{/if}
		</div>
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

	<section class="ratings" aria-label="Ratings">
		<form
			method="POST"
			action="?/rate"
			class="rating mine"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
		>
			<span class="who">Your rating</span>
			<Stars value={ratingFor(data.me.id)} name="stars" label={recipe.title} size={22} autosubmit />
		</form>
		{#each others as person (person.id)}
			{@const stars = ratingFor(person.id)}
			<div class="rating">
				<span class="who"><Avatar {person} size={20} dot /> {person.displayName}</span>
				{#if stars}
					<Stars value={stars} size={16} />
				{:else}
					<span class="unrated">Hasn’t rated it</span>
				{/if}
			</div>
		{/each}
	</section>

	{#if recipe.nutrition}
		<section aria-labelledby="nutrition">
			<h2 id="nutrition">Per serve</h2>
			<div class="nutrition">
				<div class="energy">
					<strong>{recipe.nutrition.energyKj.toLocaleString('en-AU')} kJ</strong>
					<span>{Math.round(recipe.nutrition.energyKj / 4.184).toLocaleString('en-AU')} Cal</span>
				</div>
				{#each nutrition as [label, value] (label)}
					<div>
						<strong>{grams(value)}</strong>
						<span>{label}</span>
					</div>
				{/each}
			</div>
			{#if !recipe.custom}
				<p class="small-print">
					{NUTRITION_CREDIT}{recipe.nutritionNote ? ` ${recipe.nutritionNote}` : ''}
				</p>
			{/if}
		</section>
	{/if}

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

	{#if recipe.custom}
		<div class="danger">
			<ConfirmDelete action="?/delete" label="Delete recipe" />
		</div>
	{/if}
</div>

<!-- Servings and the two things you can do with them, above the tab bar. -->
<div class="action-dock">
	{#if notice}
		<div class="notice" role="status">
			<Icon name="check" size={18} />
			<span>{notice.text}</span>
			<a href={notice.href}>{notice.link}</a>
		</div>
	{/if}
	<div class="action-bar">
		<div class="servings" role="group" aria-label="Servings">
			<button
				type="button"
				aria-label="Fewer servings"
				disabled={servings <= SERVINGS_MIN}
				onclick={() => (servings = Math.max(SERVINGS_MIN, servings - 1))}
			>
				<Icon name="minus" size={18} />
			</button>
			<span class="count" aria-live="polite">
				<strong>{servings}</strong>
				<span>{servings === 1 ? 'serve' : 'serves'}</span>
			</span>
			<button
				type="button"
				aria-label="More servings"
				disabled={servings >= SERVINGS_MAX}
				onclick={() => (servings = Math.min(SERVINGS_MAX, servings + 1))}
			>
				<Icon name="plus" size={18} />
			</button>
		</div>
		<button type="button" class="button-secondary act" onclick={() => (sheet = 'shop')}>
			Add to Lists
		</button>
		<button type="button" class="button-primary act" onclick={() => (sheet = 'schedule')}>
			Schedule
		</button>
	</div>
</div>

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
		margin-top: calc(-1 * var(--space-m));
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-s);
	}

	.tags:empty {
		display: none;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		background: rgb(255 255 255 / 0.06);
		color: var(--colour-text-muted);
		font-size: var(--text-caption);
	}

	.tag.green {
		background: rgb(140 200 120 / 0.12);
		color: #b9dca4;
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
	}

	.total dd {
		color: var(--colour-accent);
	}

	.ratings {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
		padding: var(--space-m);
		border-radius: 22px;
		background: rgb(255 255 255 / 0.04);
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
	}

	.rating {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-m);
		min-height: 40px;
		margin: 0;
	}

	.who {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: var(--text-small);
	}

	.mine .who {
		font-weight: var(--weight-medium);
	}

	.mine :global(.stars) {
		margin-right: -7px;
	}

	.unrated {
		font-size: var(--text-small);
		color: var(--colour-text-faint);
	}

	.nutrition {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}

	.nutrition div {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px;
		border-radius: 16px;
		background: rgb(255 255 255 / 0.04);
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
	}

	.nutrition strong {
		font-weight: var(--weight-medium);
		font-variant-numeric: tabular-nums;
	}

	.nutrition span {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.nutrition .energy strong {
		color: var(--colour-accent);
	}

	.small-print {
		margin: var(--space-s) 0 0;
		font-size: var(--text-caption);
		line-height: 1.45;
		color: var(--colour-text-faint);
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

	.danger {
		padding-top: var(--space-m);
		border-top: 1px solid var(--colour-hairline);
	}

	/* The bar sits just above the tab bar (52px tabs + 10px of padding + its 12px gap). */
	.action-dock {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(env(safe-area-inset-bottom) + 12px + 62px + 10px);
		z-index: 28;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 0 var(--page-gutter);
		pointer-events: none;
	}

	.action-bar,
	.notice {
		width: min(100%, 440px);
		pointer-events: auto;
	}

	.action-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px;
		border-radius: var(--radius-pill);
		background: linear-gradient(180deg, rgb(34 27 23 / 0.97), rgb(20 16 13 / 0.98));
		box-shadow:
			var(--glass-inner-light),
			inset 0 0 0 1px rgb(255 255 255 / 0.09),
			0 14px 32px -14px rgb(0 0 0 / 0.75);
	}

	.servings {
		display: flex;
		align-items: center;
		flex: none;
	}

	.servings button {
		display: grid;
		place-items: center;
		width: 38px;
		height: 44px;
		border: 0;
		border-radius: var(--radius-pill);
		background: none;
		color: var(--colour-text);
		transition: transform var(--duration-release) var(--spring-gentle);
	}

	.servings button:disabled {
		color: var(--colour-text-faint);
	}

	.servings button:global([data-pressed]) {
		transform: scale(0.85);
		transition-duration: var(--duration-press);
	}

	.count {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 38px;
		line-height: 1.05;
	}

	.count strong {
		font-size: 1.15rem;
		font-variant-numeric: tabular-nums;
	}

	.count span {
		font-size: 11px;
		color: var(--colour-text-muted);
	}

	.act {
		flex: 1;
		min-width: 0;
		min-height: 44px;
		padding: 0 10px;
		font-size: var(--text-small);
		white-space: nowrap;
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
