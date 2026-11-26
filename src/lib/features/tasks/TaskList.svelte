<script lang="ts">
	import { arrive, glide, leave } from '#lib/ui/motion.js';
	/**
	 * The open tasks on Lists › Tasks, grouped by when they're due, as in Reminders' Scheduled
	 * list: Overdue, Today, Tomorrow, Next 7 days, Later, then No date. Everyone or Mine at the
	 * top narrows it to your own (and nobody's). Past tasks sits below as its own row.
	 */
	import { page } from '$app/state';
	import { pick } from '#lib/copy/pick.js';
	import { EMPTY } from '#lib/copy/voice.js';
	import Icon from '#lib/ui/Icon.svelte';
	import { addDays } from '#lib/time.js';
	import type { Profile, Task } from '#lib/types.js';
	import TaskRow from './TaskRow.svelte';

	interface Props {
		tasks: Task[];
		people: Profile[];
		today: string;
		meId: string;
	}

	let { tasks, people, today, meId }: Props = $props();

	// Said a little differently each visit (src/lib/copy/voice.ts).
	const emptyLine = pick(EMPTY.tasks);

	const mine = $derived(page.url.searchParams.get('who') === 'mine');
	const shown = $derived(
		mine ? tasks.filter((task) => task.assigneeId === meId || !task.assigneeId) : tasks
	);

	const sections = $derived.by(() => {
		const tomorrow = addDays(today, 1);
		const week = addDays(today, 7);
		const groups: { key: string; title: string; tasks: Task[] }[] = [
			{ key: 'overdue', title: 'Overdue', tasks: [] },
			{ key: 'today', title: 'Today', tasks: [] },
			{ key: 'tomorrow', title: 'Tomorrow', tasks: [] },
			{ key: 'week', title: 'Next 7 days', tasks: [] },
			{ key: 'later', title: 'Later', tasks: [] },
			{ key: 'someday', title: 'No date', tasks: [] }
		];
		for (const task of shown) {
			const due = task.dueOn;
			const index =
				due === null
					? 5
					: due < today
						? 0
						: due === today
							? 1
							: due === tomorrow
								? 2
								: due <= week
									? 3
									: 4;
			groups[index].tasks.push(task);
		}
		return groups.filter((group) => group.tasks.length);
	});
</script>

<div class="bar">
	<p class="caption-label" aria-live="polite">
		{shown.length === 0 ? 'Nothing to do' : `${shown.length} to do`}
	</p>
	<div class="who" role="group" aria-label="Whose tasks">
		<a
			href="?"
			class:on={!mine}
			aria-current={!mine ? 'true' : undefined}
			data-sveltekit-replacestate
			data-sveltekit-noscroll>Everyone</a
		>
		<a
			href="?who=mine"
			class:on={mine}
			aria-current={mine ? 'true' : undefined}
			data-sveltekit-replacestate
			data-sveltekit-noscroll>Mine</a
		>
	</div>
</div>

{#if tasks.length === 0}
	<p class="empty">{emptyLine}</p>
{:else if shown.length === 0}
	<p class="empty">Nothing of yours to do. Nice.</p>
{:else}
	{#each sections as section (section.key)}
		<section
			class="section"
			aria-labelledby="tasks-{section.key}"
			in:arrive
			out:leave
			animate:glide
		>
			<h2 class="section-title" class:overdue={section.key === 'overdue'} id="tasks-{section.key}">
				{section.title}
			</h2>
			<ul class="rows">
				{#each section.tasks as task (task.id)}
					<TaskRow
						{task}
						{people}
						{today}
						action="?/complete"
						hideDue={section.key === 'today' || section.key === 'tomorrow'}
						openHref={task.recipeId ? `/dinner/cook/${task.id}` : `/lists/tasks/${task.id}`}
					/>
				{/each}
			</ul>
		</section>
	{/each}
{/if}

<ul class="grouped past">
	<li>
		<a class="grouped-row" href="/lists/tasks/past">
			<span class="grouped-icon" style:--icon-colour="var(--colour-fill-stronger)"
				><Icon name="archive" size={16} /></span
			>
			<span class="grouped-label">Past tasks</span>
			<span class="grouped-chevron"><Icon name="chevron" size={16} /></span>
		</a>
	</li>
</ul>

<style>
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 22px;
	}

	/* A small two-way switch, like the filter pills in Mail. */
	.who {
		display: flex;
		padding: 2px;
		border-radius: 999px;
		background: var(--colour-fill);
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
	}

	.who a {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 30px;
		padding: 0 12px;
		border-radius: 999px;
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		color: var(--colour-text-muted);
		text-decoration: none;
	}

	/* Taller to tap than it looks. */
	.who a::after {
		content: '';
		position: absolute;
		inset: -7px 0;
	}

	.who a.on {
		background: var(--pill-on);
		box-shadow: inset 0 0 0 1px var(--pill-on-edge);
		color: var(--colour-text);
	}

	.section {
		margin-top: var(--space-l);
	}

	/* Section headings as in Reminders' Scheduled list: the date is the heading. */
	.section-title {
		margin: 0 0 2px;
		font-size: var(--text-headline);
		font-weight: var(--weight-display-m);
		font-family: var(--font-display);
		letter-spacing: var(--tracking-display-m);
	}

	.section-title.overdue {
		color: var(--colour-danger);
	}

	.rows {
		margin: 0;
		padding: 0;
	}

	/* A hairline between rows that starts at the text, past the circle. */
	.rows > :global(li + li) {
		background: linear-gradient(var(--colour-separator), var(--colour-separator)) no-repeat
			calc(24px + var(--space-m)) 0 / calc(100% - 24px - var(--space-m)) var(--hairline);
	}

	.empty {
		margin-top: var(--space-l);
		color: var(--colour-text-muted);
	}

	.past {
		margin-top: var(--space-xl);
	}

	.past .grouped-icon {
		color: var(--colour-text-muted);
	}
</style>
