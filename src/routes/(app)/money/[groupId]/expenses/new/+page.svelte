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
		target=".expense-form"
		label="Got a receipt? Snap it and AI will fill in the total, what it was and the day."
		photo="only"
		submitLabel="Scan a receipt with AI"
		busyLabel="Reading the receipt…"
		photoBusyLabel="Reading the receipt…"
		outcome={form && 'assist' in form ? form.assist : null}
		filledNote="Filled in with AI from the receipt. Who paid and the split are as usual."
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
