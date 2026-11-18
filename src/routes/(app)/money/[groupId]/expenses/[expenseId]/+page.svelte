<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import ExpenseForm from '#lib/features/expenses/ExpenseForm.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.editExpense);
</script>

<svelte:head>
	<title>{data.expense.description} · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/money/{data.group.id}"
			><Icon name="back" size={18} /> {data.group.name}</a
		>
	{/snippet}
</PageHeader>

{#key data.expense.id}
	<ExpenseForm
		values={form?.values ?? data.values}
		errors={form?.errors}
		people={data.people}
		me={data.me.id}
		action="?/save"
		submitLabel="Save"
		cancelHref="/money/{data.group.id}"
	/>
{/key}

<div class="danger">
	<ConfirmDelete action="?/delete" label="Delete expense" />
</div>

<style>
	.danger {
		margin-top: var(--space-2xl);
	}
</style>
