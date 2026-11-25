<script lang="ts">
	/**
	 * Shop for dinners: the dinners planned for the next week, and everything they need merged
	 * into one list ("2 onions" and "1 onion" is "3 onions"). Untick a dinner and its things
	 * leave the list; untick anything you've got. "To taste" things, the pantry and whatever's
	 * already on Shopping sit in their own group, unticked, so the list to buy stays short. With
	 * "Remember", what you untick starts unticked next time. Add puts it all on Shopping.
	 */
	import { untrack } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { enhance } from '$app/forms';
	import {
		mergeDinnerIngredients,
		needAmount,
		startsTicked,
		type ShoppingNeed
	} from '#lib/features/recipes/dinner-shopping.js';
	import ActionDock from '#lib/ui/ActionDock.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import { formatDayLabel } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Every dinner starts ticked; untick one and its things leave the list. (The page is made
	// fresh for each visit, so reading the dinners once is right.)
	const chosen = new SvelteSet<string>(untrack(() => data.dinners.map((dinner) => dinner.id)));
	// What you've ticked or unticked yourself; everything else follows startsTicked.
	const overrides = new SvelteMap<string, boolean>();
	let remember = $state(true);
	let saving = $state(false);

	const pantry = $derived(new Set(data.pantry));
	const waiting = $derived(new Set(data.waiting));
	const needs = $derived(
		mergeDinnerIngredients(
			data.dinners.filter((dinner) => chosen.has(dinner.id)),
			pantry,
			waiting
		)
	);
	const isTicked = (need: ShoppingNeed) => overrides.get(need.key) ?? startsTicked(need);
	const toBuy = $derived(needs.filter(startsTicked));
	const probablyGot = $derived(needs.filter((need) => !startsTicked(need)));
	const count = $derived(needs.filter(isTicked).length);

	const why = (need: ShoppingNeed) =>
		need.onList ? 'Already on Shopping' : need.amounts.length === 0 ? 'To taste' : 'In the pantry';
	const forWhich = (need: ShoppingNeed) =>
		chosen.size > 1 && need.from.length > 1 ? `For ${need.from.length} dinners` : '';
</script>

<svelte:head>
	<title>Shop for dinners · home base</title>
</svelte:head>

<PageHeader title="Shop for dinners">
	{#snippet lead()}
		<a class="button-quiet" href="/lists"><Icon name="back" size={18} /> Lists</a>
	{/snippet}
</PageHeader>

{#if data.dinners.length === 0}
	<p class="empty">
		No dinners planned for the next week yet. Pick a few, and everything they need lands here as one
		list.
	</p>
	<a class="button-secondary" href="/dinner">Plan a dinner</a>
{:else}
	<form
		id="shop-form"
		method="POST"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
	>
		<section aria-labelledby="dinners-heading">
			<h2 class="group-title" id="dinners-heading">This week’s dinners</h2>
			<ul class="grouped">
				{#each data.dinners as dinner (dinner.id)}
					<li>
						<label class="grouped-row tick-row">
							<input
								class="hidden-input"
								type="checkbox"
								name="dinner"
								value={dinner.id}
								checked={chosen.has(dinner.id)}
								onchange={(event) =>
									event.currentTarget.checked ? chosen.add(dinner.id) : chosen.delete(dinner.id)}
							/>
							<span class="tick" aria-hidden="true"><Icon name="check" size={14} /></span>
							<span class="grouped-label"
								>{dinner.title}<span class="grouped-sub"
									>{formatDayLabel(dinner.dueOn, data.today)} · {dinner.servings}
									{dinner.servings === 1 ? 'serve' : 'serves'}</span
								></span
							>
						</label>
					</li>
				{/each}
			</ul>
		</section>

		{#if needs.length}
			<section aria-labelledby="buy-heading">
				<h2 class="group-title" id="buy-heading">To buy</h2>
				{#if toBuy.length}
					<ul class="grouped">
						{#each toBuy as need (need.key)}
							{@render row(need, forWhich(need))}
						{/each}
					</ul>
				{:else}
					<p class="group-note top">
						Looks like you’ve got everything. Tick anything you’re low on below.
					</p>
				{/if}
			</section>

			{#if probablyGot.length}
				<section aria-labelledby="got-heading">
					<h2 class="group-title" id="got-heading">Probably got it</h2>
					<ul class="grouped">
						{#each probablyGot as need (need.key)}
							{@render row(need, why(need))}
						{/each}
					</ul>
				</section>
			{/if}

			<ul class="grouped remember" aria-label="Pantry">
				<li>
					<label class="grouped-row switch-row">
						<span class="grouped-label"
							>Remember the pantry<span class="grouped-sub"
								>What you untick starts unticked next time</span
							></span
						>
						<input
							class="hidden-input"
							type="checkbox"
							role="switch"
							name="remember"
							bind:checked={remember}
						/>
						<span class="switch" aria-hidden="true"></span>
					</label>
				</li>
			</ul>
		{/if}

		{#if form?.message}<p class="field-error" role="alert">{form.message}</p>{/if}
	</form>

	<ActionDock>
		<button class="button-primary act shop-act" form="shop-form" disabled={saving || count === 0}>
			{saving ? 'Adding…' : count === 0 ? 'Nothing to add' : `Add ${count} to ${data.shoppingName}`}
		</button>
	</ActionDock>
{/if}

{#snippet row(need: ShoppingNeed, note: string)}
	<li>
		<label class="grouped-row tick-row">
			<input
				class="hidden-input"
				type="checkbox"
				name="need"
				value={need.key}
				checked={isTicked(need)}
				onchange={(event) => overrides.set(need.key, event.currentTarget.checked)}
			/>
			<span class="tick" aria-hidden="true"><Icon name="check" size={14} /></span>
			<span class="grouped-label"
				>{need.name}{#if note}<span class="grouped-sub">{note}</span>{/if}</span
			>
			<span class="grouped-value">{needAmount(need)}</span>
		</label>
	</li>
{/snippet}

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
		/* Clear of the dock. */
		padding-bottom: 84px;
	}

	.empty {
		color: var(--colour-text-muted);
	}

	.top {
		margin: 0 4px;
	}

	.tick-row {
		gap: 12px;
		cursor: pointer;
	}

	/* A round tick, like Reminders: an empty ring, filled with the accent once ticked. */
	.tick {
		display: grid;
		flex: none;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1.5px var(--colour-hairline-strong);
		color: transparent;
		transition:
			background-color var(--duration-quick) var(--ease-out),
			color var(--duration-quick) var(--ease-out);
	}

	input:checked + .tick {
		background: var(--colour-accent);
		box-shadow: none;
		color: var(--colour-on-accent);
	}

	input:focus-visible + .tick {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}

	.tick-row:has(input:not(:checked)) .grouped-label,
	.tick-row:has(input:not(:checked)) .grouped-value {
		color: var(--colour-text-muted);
	}

	.grouped-value {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.switch-row {
		cursor: pointer;
	}

	/* The iOS switch, as on Preferences. */
	.switch {
		position: relative;
		flex: none;
		width: 50px;
		height: 30px;
		border-radius: var(--radius-pill);
		background: var(--colour-fill-strong);
		transition: background-color var(--duration-quick) var(--ease-out);
	}

	.switch::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
		transition: transform var(--duration-settle) var(--ease-spring);
	}

	input:checked + .switch {
		background: var(--colour-accent);
	}

	input:checked + .switch::after {
		transform: translateX(20px);
	}

	input:focus-visible + .switch {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}

	:global(.shop-act) {
		flex: 1;
		justify-content: center;
	}

	@media (prefers-reduced-motion: reduce) {
		.tick,
		.switch,
		.switch::after {
			transition: none;
		}
	}
</style>
