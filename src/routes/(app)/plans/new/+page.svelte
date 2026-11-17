<script lang="ts">
	import PlanForm from '#lib/features/plans/PlanForm.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(
		form?.values ?? {
			title: '',
			notes: '',
			location: '',
			date: data.date,
			allDay: false,
			startTime: '19:00',
			endTime: ''
		}
	);
</script>

<svelte:head>
	<title>New plan · home base</title>
</svelte:head>

<PageHeader title="New plan">
	{#snippet lead()}
		<a class="button-quiet" href="/plans"><Icon name="back" size={18} /> Plans</a>
	{/snippet}
</PageHeader>

<PlanForm {values} errors={form?.errors} action="" submitLabel="Add plan" />
