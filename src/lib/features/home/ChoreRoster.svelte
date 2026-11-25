<script lang="ts">
	/**
	 * The week's jobs, by person: who's got what in the next seven days (and anything overdue),
	 * with each person's ticks this week beside their name, so it's easy to see whether the load
	 * is shared. Unassigned chores sit under "Up for grabs". A few rows each; the full list is a
	 * tap away.
	 */
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { formatDueLabel, todayISO } from '#lib/time.js';
	import type { Profile, Score, Task } from '#lib/types.js';

	interface Props {
		chores: Task[];
		people: Profile[];
		scores: Score[];
		meId: string;
	}

	let { chores, people, scores, meId }: Props = $props();

	const SHOWN = 4;
	const today = todayISO();

	const groups = $derived.by(() => {
		const ordered = [...people].sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : 0));
		const rows = ordered.map((person) => ({
			key: person.id,
			person: person as Profile | null,
			name: person.id === meId ? 'You' : person.displayName,
			done: scores.find((score) => score.profileId === person.id)?.thisWeek ?? 0,
			chores: chores.filter((chore) => chore.assigneeId === person.id)
		}));
		const open = chores.filter(
			(chore) => !chore.assigneeId || !people.some((person) => person.id === chore.assigneeId)
		);
		if (open.length)
			rows.push({ key: 'anyone', person: null, name: 'Up for grabs', done: 0, chores: open });
		return rows;
	});

	const toDo = (n: number) => (n === 0 ? 'All clear' : `${n} to do`);
</script>

<div class="roster">
	{#each groups as group (group.key)}
		<section class="group" aria-label={group.name}>
			<header>
				{#if group.person}
					<Avatar person={group.person} size={32} ring />
				{:else}
					<span class="anyone" aria-hidden="true"><Icon name="lists" size={16} /></span>
				{/if}
				<span class="who">{group.name}</span>
				<span class="tally">
					{toDo(group.chores.length)}
					{#if group.person && group.done > 0}
						<span class="done">· {group.done} done</span>
					{/if}
				</span>
			</header>
			{#if group.chores.length}
				<ul>
					{#each group.chores.slice(0, SHOWN) as chore (chore.id)}
						{@const late = chore.dueOn !== null && chore.dueOn < today}
						<li>
							<a href="/lists/tasks/{chore.id}">
								<span class="title one-line">{chore.title}</span>
								{#if chore.repeat !== 'none'}
									<span class="repeat" aria-label="Repeats"><Icon name="repeat" size={14} /></span>
								{/if}
								{#if chore.dueOn}
									<span class="when" class:late>{formatDueLabel(chore.dueOn, today)}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
				{#if group.chores.length > SHOWN}
					<a class="more" href="/lists/tasks">{group.chores.length - SHOWN} more</a>
				{/if}
			{/if}
		</section>
	{/each}
</div>

<style>
	/* One grouped card, like House info and the lists below it, each person a block inside. */
	.roster {
		display: flex;
		flex-direction: column;
		padding: 4px 16px;
		border-radius: 16px;
		background: var(--colour-fill);
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
	}

	.group {
		padding: 10px 0;
	}

	.group + .group {
		box-shadow: inset 0 1px var(--colour-hairline);
	}

	header {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 36px;
	}

	.anyone {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--colour-fill-strong);
		color: var(--colour-text-muted);
	}

	.who {
		flex: 1;
		font-weight: var(--weight-medium);
	}

	.tally {
		font-size: var(--text-caption);
		font-variant-numeric: tabular-nums;
		color: var(--colour-text-muted);
	}

	.done {
		color: var(--colour-accent);
	}

	ul {
		margin: 6px 0 0 42px;
		padding: 0;
		list-style: none;
	}

	li + li {
		box-shadow: inset 0 1px var(--colour-hairline);
	}

	li a {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		color: inherit;
		text-decoration: none;
	}

	.title {
		flex: 1;
		min-width: 0;
		font-size: var(--text-small);
	}

	.repeat {
		display: inline-flex;
		color: var(--colour-text-faint);
	}

	.when {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.when.late {
		color: var(--colour-danger);
	}

	.more {
		display: inline-flex;
		align-items: center;
		min-height: 36px;
		margin-left: 42px;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}
</style>
