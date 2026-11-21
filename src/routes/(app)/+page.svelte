<script lang="ts">
	import FeedSection from '#lib/features/feed/FeedSection.svelte';
	import ScoreAvatars from '#lib/features/points/ScoreAvatars.svelte';
	import HomeShortcuts from '#lib/features/today/HomeShortcuts.svelte';
	import ComingUp from '#lib/features/today/ComingUp.svelte';
	import GettingStarted from '#lib/features/today/GettingStarted.svelte';
	import ListsGlance from '#lib/features/today/ListsGlance.svelte';
	import WeekSummary from '#lib/features/today/WeekSummary.svelte';
	import { formatTodayHeading } from '#lib/time.js';
	import UndoToast from '#lib/ui/UndoToast.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const heading = $derived(formatTodayHeading(new Date(`${data.today}T12:00:00Z`)));
	const tonight = $derived(
		data.comingUp.find(
			(item) => item.kind === 'task' && item.task.recipe && item.task.dueOn === data.today
		)
	);

	// The feed streams in after the rest of the screen. Keep showing the last posts while a
	// refresh's arrive, so the feed never blanks out every minute.
	type FeedPage = Awaited<typeof data.feed>;
	let feed = $state<FeedPage | null>(null);
	let feedFailed = $state(false);
	$effect(() => {
		let current = true;
		data.feed.then(
			(page) => {
				if (!current) return;
				feed = page;
				feedFailed = false;
			},
			() => current && (feedFailed = true)
		);
		return () => (current = false);
	});
</script>

<svelte:head>
	<title>Today · home base</title>
</svelte:head>

<header class="header">
	<div class="heading">
		<h1>
			{heading.primary}
			<span class="month">{heading.secondary}</span>
		</h1>
		<WeekSummary plain={data.week.plain} fingerprint={data.week.fingerprint} ai={data.ai} />
	</div>
	<ScoreAvatars people={data.household.members} scores={data.scores} />
</header>

<div class="stack">
	{#if data.start}<GettingStarted steps={data.start} />{/if}
	<ComingUp items={data.comingUp} people={data.household.members} today={data.today} />
	<ListsGlance lists={data.lists} />
	<HomeShortcuts tonight={tonight?.kind === 'task' ? (tonight.task.recipe?.title ?? null) : null} />
	<FeedSection
		posts={feed?.posts ?? null}
		unavailable={feedFailed}
		hasMore={feed?.hasMore ?? false}
		pageSize={feed?.pageSize ?? 5}
		people={data.household.members}
		me={data.me.id}
	/>
</div>

{#if form && 'ticked' in form && form.ticked}
	<UndoToast
		key={form.ticked.id}
		message="Ticked off: {form.ticked.title}"
		action="?/undoTask"
		fields={{ taskId: form.ticked.id }}
	/>
{/if}

<style>
	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-m);
	}

	.heading {
		min-width: 0;
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
		gap: 24px;
		margin-top: 24px;
	}
</style>
