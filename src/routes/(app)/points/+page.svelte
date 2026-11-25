<script lang="ts">
	import { EMPTY } from '#lib/copy/voice.js';
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import Avatar from '#lib/ui/Avatar.svelte';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import { formatClock, formatDayLabel, zonedParts } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Said a little differently each visit (src/lib/copy/voice.ts).
	const emptyLine = pick(EMPTY.points);

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.scores);

	const rows = $derived(
		data.household.members.map((person) => {
			const score = data.scores.find((entry) => entry.profileId === person.id);
			return { person, thisWeek: score?.thisWeek ?? 0, allTime: score?.allTime ?? 0 };
		})
	);
	const top = $derived(Math.max(...rows.map((row) => row.thisWeek)));
	const leaders = $derived(rows.filter((row) => row.thisWeek === top && top > 0));
	const tied = $derived(leaders.length > 1);

	const personFor = (id: string | null) =>
		data.household.members.find((person) => person.id === id);
	const when = (iso: string) => {
		const day = formatDayLabel(zonedParts(new Date(iso)).date, data.today);
		return `${day} · ${formatClock(new Date(iso))}`;
	};
</script>

<svelte:head>
	<title>Scores · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/"><Icon name="back" size={18} /> Today</a>
	{/snippet}
</PageHeader>

<p class="intro">One point for every task you tick off. The week starts fresh on Monday.</p>

<div class="board">
	{#each rows as row (row.person.id)}
		{@const leading = leaders.some((leader) => leader.person.id === row.person.id)}
		<section
			class="score-card"
			class:leading
			aria-label="{row.person.displayName}: {row.thisWeek} this week, {row.allTime} all time"
		>
			<GlassSurface radius={24} glow={leading} />
			<div class="body">
				<span class="avatar"><Avatar person={row.person} size={36} /></span>
				<span class="name">{row.person.displayName}</span>
				<span class="week">{row.thisWeek}</span>
				<span class="week-label">this week</span>
				<span class="all-time">{row.allTime} all time</span>
				{#if leading}<span class="badge">{tied ? 'Tied' : 'Leading'}</span>{/if}
			</div>
		</section>
	{/each}
</div>

<section class="recent" aria-labelledby="recent-heading">
	<h2 id="recent-heading" class="section-label caption-label">Recent points</h2>
	{#if data.recent.length === 0}
		<p class="empty">{emptyLine}</p>
	{:else}
		<ul>
			{#each data.recent as task (task.id)}
				{@const person = personFor(task.completedBy)}
				<li>
					<span
						class="plus"
						style:--person-colour={person?.accentColour ?? 'var(--colour-text-faint)'}>+1</span
					>
					<span class="text">
						<span class="title">{task.title}</span>
						<span class="meta">{person?.displayName ?? 'Someone'} · {when(task.completedAt!)}</span>
					</span>
				</li>
			{/each}
		</ul>
		<a class="button-quiet" href="/lists/tasks/past">All past tasks</a>
	{/if}
</section>

<style>
	.intro {
		margin-top: -8px;
		margin-bottom: var(--space-l);
		color: var(--colour-text-muted);
		font-size: var(--text-small);
	}

	.board {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.score-card {
		position: relative;
		border-radius: var(--radius-tile);
	}

	.body {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 18px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 var(--hairline) var(--colour-separator),
			var(--glass-highlight);
	}

	.leading .body {
		box-shadow:
			inset 0 0 0 var(--hairline) var(--colour-accent-separator),
			var(--glass-highlight);
	}

	.avatar {
		display: flex;
	}

	.name {
		margin-top: 10px;
		font-weight: var(--weight-medium);
	}

	.week {
		margin-top: 12px;
		font-size: 3rem;
		line-height: 1;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		font-variant-numeric: tabular-nums;
	}

	.week-label {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.all-time {
		margin-top: 10px;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.badge {
		position: absolute;
		top: 18px;
		right: 16px;
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		color: var(--colour-accent);
	}

	.recent {
		margin-top: var(--space-xl);
	}

	.section-label {
		margin-bottom: var(--space-xs);
	}

	ul {
		margin: 0 0 var(--space-s);
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: var(--space-m);
		min-height: var(--row-height);
	}

	.plus {
		display: grid;
		place-items: center;
		flex: none;
		width: 36px;
		height: 24px;
		border-radius: var(--radius-pill);
		background: var(--person-colour);
		color: var(--colour-on-ring);
		font-size: var(--text-caption);
		font-weight: var(--weight-strong);
	}

	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.title {
		overflow-wrap: anywhere;
	}

	.meta {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.empty {
		color: var(--colour-text-faint);
	}
</style>
