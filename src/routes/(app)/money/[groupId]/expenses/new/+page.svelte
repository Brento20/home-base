<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import ExpenseForm from '#lib/features/expenses/ExpenseForm.svelte';
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

<ExpenseForm
	values={form?.values ?? data.values}
	errors={form?.errors}
	people={data.people}
	me={data.me.id}
	action=""
	submitLabel="Add it"
/>
