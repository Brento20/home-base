<script lang="ts">
	import ScoreAvatars from '#lib/features/points/ScoreAvatars.svelte';
	import HomeShortcuts from '#lib/features/today/HomeShortcuts.svelte';
	import ComingUp from '#lib/features/today/ComingUp.svelte';
	import ListsGlance from '#lib/features/today/ListsGlance.svelte';
	import { formatTodayHeading } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const heading = $derived(formatTodayHeading(new Date(`${data.today}T12:00:00Z`)));
</script>

<svelte:head>
	<title>Today · home base</title>
</svelte:head>

<header class="header">
	<h1>
		{heading.primary}
		<span class="month">{heading.secondary}</span>
	</h1>
	<ScoreAvatars people={data.household.members} scores={data.scores} />
</header>

<div class="stack">
	<ComingUp items={data.comingUp} people={data.household.members} today={data.today} />
	<ListsGlance lists={data.lists} />
	<HomeShortcuts />
</div>

<style>
	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-m);
	}

	h1 {
		font-size: var(--text-page-title);
		line-height: 1.12;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
	}

	.month {
		display: block;
		font-weight: var(--weight-regular);
		color: var(--colour-text-muted);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 30px;
		margin-top: 28px;
	}
</style>
