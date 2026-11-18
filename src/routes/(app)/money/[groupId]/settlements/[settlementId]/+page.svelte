<script lang="ts">
	import { describeSettlement } from '#lib/features/expenses/describe.js';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import { formatLongDate } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { settlement } = $derived(data);
</script>

<svelte:head>
	<title>Repayment · home base</title>
</svelte:head>

<PageHeader title="Repayment">
	{#snippet lead()}
		<a class="button-quiet" href="/money/{data.group.id}"
			><Icon name="back" size={18} /> {data.group.name}</a
		>
	{/snippet}
</PageHeader>

<p class="what">
	{describeSettlement(
		settlement.paidBy,
		settlement.paidTo,
		settlement.amountCents,
		data.people,
		data.me.id
	)}
</p>
<p class="when">{formatLongDate(settlement.paidOn)}</p>
<p class="explain">
	Recorded with Settle up. Deleting it puts the amount back into the balance, for when it was
	recorded by mistake.
</p>

<ConfirmDelete action="?/delete" label="Delete repayment" />

<style>
	.what {
		font-size: 1.5rem;
		line-height: 1.2;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
	}

	.when {
		margin-top: var(--space-xs);
		color: var(--colour-text-muted);
	}

	.explain {
		max-width: 36ch;
		margin-top: var(--space-l);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}
</style>
