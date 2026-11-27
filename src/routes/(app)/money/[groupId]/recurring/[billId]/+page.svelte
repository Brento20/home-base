<script lang="ts">
	/**
	 * A recurring bill: what it adds and how often, changed from the next bill on (what it's
	 * already added stays as it was). Pause it for a while, or stop it for good.
	 */
	import { enhance } from '$app/forms';
	import { saveForm } from '#lib/ui/save.svelte.js';
	import ExpenseForm from '#lib/features/expenses/ExpenseForm.svelte';
	import { frequencyLabel } from '#lib/features/expenses/recurring.js';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import { formatDayLabel, todayISO } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.bill.description} · home base</title>
</svelte:head>

<PageHeader title={data.bill.description}>
	{#snippet lead()}
		<a class="button-quiet" href="/money/{data.group.id}"
			><Icon name="back" size={18} /> {data.group.name}</a
		>
	{/snippet}
</PageHeader>

<div class="status">
	<p>
		{#if data.bill.paused}
			Paused. It won’t add itself until you resume it.
		{:else}
			{frequencyLabel(data.bill.frequency)}. Next on {formatDayLabel(data.bill.nextOn, todayISO())}.
		{/if}
	</p>
	<form method="POST" action="?/pause" use:enhance={saveForm}>
		<button class="button-secondary">{data.bill.paused ? 'Resume' : 'Pause'}</button>
	</form>
</div>

{#key data.bill.id}
	<ExpenseForm
		values={form?.values ?? data.values}
		errors={form?.errors}
		people={data.people}
		me={data.me.id}
		action="?/save"
		submitLabel="Save"
		repeat={data.bill.frequency}
		repeatOnly
	/>
{/key}

<ConfirmDelete action="?/stop" label="Stop repeating" confirmLabel="Tap again to stop it" />
<p class="group-note">Bills it’s already added stay in the group.</p>

<style>
	.status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-m);
		margin-bottom: var(--space-l);
		padding: 12px 16px;
		border-radius: 16px;
		background: var(--colour-fill);
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
	}

	.status p {
		margin: 0;
		color: var(--colour-text-muted);
	}
</style>
