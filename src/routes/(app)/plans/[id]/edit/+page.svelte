<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import PlanForm from '#lib/features/plans/PlanForm.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.editPlan);
</script>

<svelte:head>
	<title>{data.plan.title} · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/plans/{data.plan.id}"><Icon name="back" size={18} /> Back</a>
	{/snippet}
</PageHeader>

<PlanForm
	values={form?.values ?? data.values}
	errors={form?.errors}
	action="?/save"
	submitLabel="Save"
	cancelHref="/plans/{data.plan.id}"
/>

<div class="danger">
	<ConfirmDelete action="?/delete" label="Delete plan" />
</div>

<style>
	.danger {
		margin-top: var(--space-xl);
		padding-top: var(--space-m);
		border-top: 1px solid var(--colour-hairline);
	}
</style>
