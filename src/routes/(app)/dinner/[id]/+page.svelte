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
	import PhotoUpload from '#lib/features/recipes/PhotoUpload.svelte';
	import ScheduleForm from '#lib/features/recipes/ScheduleForm.svelte';
	import ServingsStepper from '#lib/features/recipes/ServingsStepper.svelte';
	import ShoppingForm from '#lib/features/recipes/ShoppingForm.svelte';
	import ActionDock from '#lib/ui/ActionDock.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';
	import { enhance } from '$app/forms';
	import { save } from '#lib/ui/save.svelte.js';
	import { page } from '$app/state';
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

	let sheet = $state<'shop' | 'schedule' | 'photo' | null>(null);

	// The dish's photo: added, changed or removed from here, for any recipe.
	let photoBusy = $state(false);
	let photoNote = $state<string | null>(
		page.url.searchParams.get('photo') === 'failed'
			? 'The photo didn’t upload. Add it again with the camera button.'
			: null
	);
	let removeArmed = $state(false);
	let removeTimer: ReturnType<typeof setTimeout> | undefined;
	function armRemove(event: MouseEvent) {
		if (removeArmed) return;
		event.preventDefault();
		removeArmed = true;
		clearTimeout(removeTimer);
		removeTimer = setTimeout(() => (removeArmed = false), 4000);
	}
	const photoSaved = () => {
		sheet = null;
		photoNote = null;
	};
	const photoProblem = (message: string) => {
		sheet = null;
		photoNote = message;
	};
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

	const removingPhoto = save({
		reset: true,
		after: () => {
			removeArmed = false;
			sheet = null;
		}
	});
</script>

<svelte:head>
	<title>{recipe.title} · home base</title>
</svelte:head>

<div class="top" class:has-photo={data.photoUrl}>
	{#if data.photoUrl}
		<div class="hero">
			<img src={data.photoUrl} alt="The dish" decoding="async" />
		</div>
	{/if}
	<PageHeader title={recipe.title}>
		{#snippet lead()}
			<a class="button-quiet" href="/dinner"><Icon name="back" size={18} /> Dinner</a>
		{/snippet}
		{#snippet trailing()}
			<span class="header-tools">
				{#if data.photoUrl}
					<button
						type="button"
						class="button-edit icon"
						aria-label="Photo"
						aria-busy={photoBusy}
						onclick={() => (sheet = 'photo')}
					>
						<Icon name="camera" size={18} />
					</button>
				{:else}
					<PhotoUpload
						action="?/photo"
						label="Add a photo"
						class="button-edit icon"
						bind:busy={photoBusy}
						onsaved={photoSaved}
						onproblem={photoProblem}
					>
						<Icon name="camera" size={18} />
					</PhotoUpload>
				{/if}
				{#if recipe.custom}<a class="button-edit" href="/dinner/{recipe.id}/edit">Edit</a>{/if}
			</span>
		{/snippet}
	</PageHeader>
</div>

{#if photoBusy || photoNote}
	<p class="photo-note" role="status">{photoBusy ? 'Saving the photo…' : photoNote}</p>
{/if}

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

<Sheet open={sheet === 'photo'} title="Photo" onclose={() => (sheet = null)}>
	<div class="photo-sheet">
		<PhotoUpload
			action="?/photo"
			label="Choose a new photo"
			class="button-secondary wide"
			bind:busy={photoBusy}
			onsaved={photoSaved}
			onproblem={photoProblem}
		>
			<Icon name="camera" size={18} />
			{photoBusy ? 'Saving…' : 'Choose a new photo'}
		</PhotoUpload>
		<form method="POST" action="?/removePhoto" use:enhance={removingPhoto.enhance}>
			<button class="remove-photo" class:armed={removeArmed} onclick={armRemove} aria-live="polite">
				{removeArmed ? 'Tap again to remove it' : 'Remove photo'}
			</button>
		</form>
	</div>
</Sheet>

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
	/*
	 * With a photo, it fills the top of the screen behind the back link, under the status bar,
	 * and melts into the backdrop; the title sits over its lower edge.
	 */
	.top {
		position: relative;
	}

	.hero {
		position: absolute;
		top: calc(-1 * (env(safe-area-inset-top) + 28px));
		left: calc(-1 * var(--page-gutter));
		right: calc(-1 * var(--page-gutter));
		height: calc(env(safe-area-inset-top) + 320px);
		overflow: hidden;
		-webkit-mask-image: linear-gradient(180deg, #000 55%, transparent);
		mask-image: linear-gradient(180deg, #000 55%, transparent);
		pointer-events: none;
	}

	.hero img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* A soft shade at the top keeps the status bar and the back link readable on a bright photo. */
	.hero::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgb(0 0 0 / 0.38), transparent 30%);
	}

	.has-photo :global(.page-header) {
		position: relative;
	}

	.has-photo :global(.title-row) {
		margin-top: 196px;
	}

	.has-photo :global(.page-title) {
		text-shadow: 0 1px 18px rgb(0 0 0 / 0.45);
	}

	.has-photo :global(.lead .button-quiet),
	.has-photo :global(.lead .button-edit) {
		border-color: rgb(255 255 255 / 0.22);
		background: rgb(14 10 8 / 0.5);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
		color: #fff;
	}

	.has-photo :global(.lead .button-quiet) {
		padding: 0 14px 0 10px;
		border-radius: var(--radius-pill);
	}

	/* On the glass pill, the chevron's stroke sits as far in as the word does on the other side. */
	.has-photo :global(.lead .button-quiet > .icon-back) {
		margin-inline-start: calc(var(--icon-size) * -3.5 / 24);
	}

	.header-tools {
		display: flex;
		gap: 8px;
	}

	.header-tools :global(.icon) {
		min-width: var(--tap-target);
		padding: 0;
	}

	.photo-note {
		margin: calc(-1 * var(--space-s)) 0 var(--space-l);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.photo-sheet {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
	}

	.photo-sheet :global(.wide) {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
	}

	.remove-photo {
		width: 100%;
		min-height: var(--tap-target);
		border: 0;
		background: none;
		color: var(--colour-danger);
		font: inherit;
		font-weight: var(--weight-medium);
	}

	.remove-photo.armed {
		font-weight: var(--weight-strong);
	}

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
		color: var(--colour-veg);
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
		display: flex;
		align-items: center;
		width: fit-content;
		min-height: var(--tap-target);
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
		background: var(--surface-raised);
		box-shadow:
			inset 0 0 0 var(--hairline) var(--colour-separator-strong),
			0 10px 28px -12px var(--shadow-colour);
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
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		padding: 0 12px;
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
