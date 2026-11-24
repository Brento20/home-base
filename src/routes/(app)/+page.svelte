<script lang="ts">
	import FeedSection from '#lib/features/feed/FeedSection.svelte';
	import ScoreAvatars from '#lib/features/points/ScoreAvatars.svelte';
	import HomeShortcuts from '#lib/features/today/HomeShortcuts.svelte';
	import ComingUp from '#lib/features/today/ComingUp.svelte';
	import GettingStarted from '#lib/features/today/GettingStarted.svelte';
	import ListsGlance from '#lib/features/today/ListsGlance.svelte';
	import AddBar from '#lib/features/today/AddBar.svelte';
	import WeekSummary from '#lib/features/today/WeekSummary.svelte';
	import { formatTodayHeading } from '#lib/time.js';
	import { kept } from '#lib/ui/kept.svelte.js';
	import Reveal from '#lib/ui/Reveal.svelte';
	import UndoToast from '#lib/ui/UndoToast.svelte';
	import type { PageProps } from './$types';

	// The real sections' heights, so placeholders hold their place exactly. Coming up includes
	// the add bar on top of it (48px, then a 12px gap).
	const COMING_UP_HEIGHT = 274;
	const LISTS_HEIGHT = 219;

	let { data, form }: PageProps = $props();

	// The screen is the copy this phone kept from last time until fresh data lands, then updates
	// in place (src/lib/ui/kept.svelte.ts); the first visit on a slow day shows placeholders.
	const screen = kept(
		() => 'today',
		() => data.screen
	);
	const feed = kept(
		() => 'today-feed',
		() => data.feed
	);
	const today = $derived(screen.current);

	const heading = $derived(formatTodayHeading(new Date(`${data.today}T12:00:00Z`)));
	const tonight = $derived(
		today?.comingUp.find(
			(item) => item.kind === 'task' && item.task.recipe && item.task.dueOn === data.today
		)
	);
</script>

<svelte:head>
	<title>Today · home base</title>
</svelte:head>

<header class="header">
	<div class="heading">
		<h1 class="page-title">
			{heading.primary}
			<span class="month">{heading.secondary}</span>
		</h1>
		{#if today}
			<WeekSummary plain={today.week.plain} fingerprint={today.week.fingerprint} ai={data.ai} />
		{:else}
			<span class="line-waiting" aria-hidden="true"><span></span><span></span><span></span></span>
		{/if}
	</div>
	<ScoreAvatars people={data.household.members} scores={today?.scores ?? null} />
</header>

<div class="stack">
	<Reveal of={screen} placeholder={[COMING_UP_HEIGHT, LISTS_HEIGHT]} gap={24} label="Loading today">
		{#snippet children(today)}
			{#if today.start}<GettingStarted steps={today.start} />{/if}
			<!-- The add bar sits on the row it adds to, closer than the sections around them. -->
			<div class="coming">
				<AddBar
					values={form && 'addBar' in form ? form.addBar : undefined}
					errors={form && 'addBarErrors' in form ? form.addBarErrors : undefined}
					cards={today.comingUp.length > 0}
				/>
				<ComingUp items={today.comingUp} people={data.household.members} today={data.today} />
			</div>
			<ListsGlance lists={today.lists} />
		{/snippet}
	</Reveal>
	<HomeShortcuts tonight={tonight?.kind === 'task' ? (tonight.task.recipe?.title ?? null) : null} />
	<FeedSection
		posts={feed.current?.posts ?? null}
		unavailable={feed.failed && !feed.current}
		hasMore={feed.current?.hasMore ?? false}
		pageSize={feed.current?.pageSize ?? 5}
		people={data.household.members}
		me={data.me.id}
	/>
</div>

{#if form && 'added' in form && form.added}
	<UndoToast
		key={form.added.id}
		message="Added to Tasks: {form.added.title}"
		action="?/undoAdd"
		fields={{ taskId: form.added.id }}
	/>
{/if}

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

	.month {
		display: block;
		font-weight: var(--weight-regular);
		color: var(--colour-text-muted);
	}

	/* The day's line, still on its way: a soft bar where it will be. */
	.line-waiting {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 10px;
	}

	.line-waiting > span {
		display: block;
		width: 85%;
		height: 0.9em;
		border-radius: 6px;
		background: var(--colour-fill);
	}

	.line-waiting > span:nth-child(2) {
		width: 95%;
	}

	.line-waiting > span:last-child {
		width: 55%;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 24px;
		margin-top: 24px;
	}

	.coming {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
</style>
