<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import PlanForm from '#lib/features/plans/PlanForm.svelte';
	import AssistBox from '#lib/ui/AssistBox.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.newPlan);

	const postId = $derived(form?.postId ?? data.fromPost?.id ?? null);
	const values = $derived(
		(form && 'values' in form ? form.values : null) ?? {
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

{#if data.ai && !postId}
	<AssistBox
		action="?/describe"
		label="Say it how you’d text it, and I’ll fill in the rest."
		placeholder="Dinner with Sam at Fratelli, Saturday 7"
		submitLabel="Fill it in"
		busyLabel="Reading it…"
		outcome={form && 'assist' in form ? form.assist : null}
		focusOnFail="#plan-title"
	/>
{/if}

{#key form}
	<PlanForm
		{values}
		errors={form && 'errors' in form ? form.errors : undefined}
		action="?/create"
		submitLabel="Lock it in"
		{postId}
	/>
{/key}

<style>
	.from-post {
		margin: calc(-1 * var(--space-s)) 0 var(--space-l);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}
</style>
