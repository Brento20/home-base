<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import PlanForm from '#lib/features/plans/PlanForm.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.newPlan);

	const postId = $derived(form?.postId ?? data.fromPost?.id ?? null);
	const values = $derived(
		form?.values ?? {
			title: data.fromPost?.title ?? '',
			notes: data.fromPost?.notes ?? '',
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

<PageHeader title={heading}>
	{#snippet lead()}
		{#if postId}
			<a class="button-quiet" href="/feed/{postId}"><Icon name="back" size={18} /> Post</a>
		{:else}
			<a class="button-quiet" href="/plans"><Icon name="back" size={18} /> Plans</a>
		{/if}
	{/snippet}
</PageHeader>

{#if postId}
	<p class="from-post">From the home feed. Pick a time and it’ll show on the post too.</p>
{/if}

<PlanForm {values} errors={form?.errors} action="" submitLabel="Lock it in" {postId} />

<style>
	.from-post {
		margin: calc(-1 * var(--space-s)) 0 var(--space-l);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}
</style>
