<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import ExpenseForm from '#lib/features/expenses/ExpenseForm.svelte';
	import AssistBox from '#lib/ui/AssistBox.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.addExpense);
</script>

<svelte:head>
	<title>Add expense · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/money/{data.group.id}"
			><Icon name="back" size={18} /> {data.group.name}</a
		>
	{/snippet}
</PageHeader>

{#if data.ai}
	<AssistBox
		action="?/receipt"
		label="Got a receipt? Snap it and I’ll fill in the total."
		photo="only"
		submitLabel="Snap a receipt"
		busyLabel="Reading the receipt…"
		outcome={form && 'assist' in form ? form.assist : null}
		filledNote="Filled in from the receipt. Check the total and split, then add it."
		focusOnFail="#expense-amount"
	/>
{/if}

<!-- A receipt fill swaps in a fresh form with the new values. -->
{#key form}
	<ExpenseForm
		values={form && 'values' in form && form.values ? form.values : data.values}
		errors={form && 'errors' in form ? form.errors : undefined}
		people={data.people}
		me={data.me.id}
		action="?/create"
		submitLabel="Add it"
	/>
{/key}
