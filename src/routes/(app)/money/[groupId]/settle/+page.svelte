<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { save } from '#lib/ui/save.svelte.js';
	import { describeDebt } from '#lib/features/expenses/describe.js';
	import { centsToInput, currencySymbol } from '#lib/features/expenses/money.js';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { Debt } from '#lib/features/expenses/balances.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.settleUp);

	const start = untrack(() => form?.values ?? null);
	const suggested = untrack(() => data.suggested);
	let paidBy = $state(start?.paidBy ?? suggested?.from ?? '');
	let paidTo = $state(start?.paidTo ?? suggested?.to ?? '');
	let amount = $state(start?.amount ?? (suggested ? centsToInput(suggested.cents) : ''));
	const saving = save();

	function use(debt: Debt) {
		paidBy = debt.from;
		paidTo = debt.to;
		amount = centsToInput(debt.cents);
	}

	const label = (id: string) =>
		id === data.me.id ? 'You' : (data.people.find((p) => p.id === id)?.displayName ?? '');
</script>

<svelte:head>
	<title>Settle up · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/money/{data.group.id}"
			><Icon name="back" size={18} /> {data.group.name}</a
		>
	{/snippet}
</PageHeader>

<p class="intro">
	Record money you’ve paid each other outside the app, like a bank transfer. It moves the balance,
	and isn’t counted as spending.
</p>

{#if data.debts.length > 1}
	<div class="suggestions" role="group" aria-label="Suggested repayments">
		{#each data.debts as debt (debt.from + debt.to)}
			<button
				type="button"
				class="choice-pill"
				class:picked={paidBy === debt.from && paidTo === debt.to}
				onclick={() => use(debt)}>{describeDebt(debt, data.people, data.me.id)}</button
			>
		{/each}
	</div>
{/if}

<form method="POST" class="form-stack" use:enhance={saving.enhance}>
	<fieldset class="field">
		<legend class="field-label">Who paid</legend>
		<div class="choice-pills">
			{#each data.people as person (person.id)}
				<label class="choice-pill">
					<input type="radio" name="paidBy" value={person.id} bind:group={paidBy} />
					<Avatar {person} size={22} dot />
					{label(person.id)}
				</label>
			{/each}
		</div>
	</fieldset>

	<fieldset class="field">
		<legend class="field-label">Who got it</legend>
		<div class="choice-pills">
			{#each data.people as person (person.id)}
				<label class="choice-pill">
					<input type="radio" name="paidTo" value={person.id} bind:group={paidTo} />
					<Avatar {person} size={22} dot />
					{label(person.id)}
				</label>
			{/each}
		</div>
		{#if form?.errors?.people}<span class="field-error">{form.errors.people}</span>{/if}
	</fieldset>

	<div class="field-row">
		<label class="field">
			<span class="field-label">Amount</span>
			<span class="money-input">
				<span class="currency" aria-hidden="true">{currencySymbol()}</span>
				<input
					class="field-input"
					name="amount"
					inputmode="decimal"
					autocomplete="off"
					bind:value={amount}
					required
					aria-invalid={form?.errors?.amount ? 'true' : undefined}
				/>
			</span>
			{#if form?.errors?.amount}<span class="field-error">{form.errors.amount}</span>{/if}
		</label>
		<label class="field">
			<span class="field-label">Date</span>
			<input
				class="field-input"
				name="paidOn"
				type="date"
				value={form?.values?.paidOn ?? data.today}
				required
			/>
		</label>
	</div>

	{#if form?.message}<p class="form-message" role="alert">{form.message}</p>{/if}

	<div class="form-actions">
		<button class="button-primary" disabled={saving.busy}
			>{saving.busy ? 'Saving…' : 'Record repayment'}</button
		>
	</div>
</form>

<style>
	.intro {
		max-width: 36ch;
		margin-bottom: var(--space-l);
		color: var(--colour-text-muted);
	}

	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-s);
		margin-bottom: var(--space-l);
	}

	.suggestions .choice-pill {
		background: none;
		font: inherit;
		font-size: var(--text-small);
	}

	.suggestions .picked {
		border-color: var(--colour-accent-edge);
		background: var(--colour-accent-soft);
		color: var(--colour-text);
	}
</style>
