<script lang="ts">
	import { describeRepeat } from '#lib/features/tasks/repeat.js';
	import { enhance } from '$app/forms';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import { formatClock, formatDayLabel, zonedParts } from '#lib/time.js';
	import type { Task } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const groups = $derived.by(() => {
		const result: { label: string; tasks: Task[] }[] = [];
		for (const task of data.tasks) {
			const label = formatDayLabel(zonedParts(new Date(task.completedAt!)).date, data.today);
			if (result.at(-1)?.label !== label) result.push({ label, tasks: [] });
			result.at(-1)!.tasks.push(task);
		}
		return result;
	});

	const doneBy = (task: Task) =>
		data.household.members.find((person) => person.id === task.completedBy);
</script>

<svelte:head>
	<title>Past tasks · home base</title>
</svelte:head>

<PageHeader title="Past tasks">
	{#snippet lead()}
		<a class="button-quiet" href="/lists/tasks"><Icon name="back" size={18} /> Tasks</a>
	{/snippet}
</PageHeader>

{#if groups.length === 0}
	<p class="empty">Ticked-off tasks will show up here.</p>
{:else}
	{#each groups as group (group.label)}
		<section class="day">
			<h2 class="day-label">{group.label}</h2>
			<ul>
				{#each group.tasks as task (task.id)}
					{@const person = doneBy(task)}
					<li class="past-task">
						<span
							class="ring"
							style:--ring-colour={person?.accentColour ?? 'var(--colour-text-faint)'}
						>
							<Icon name="check" size={12} />
						</span>
						<span class="text">
							<span class="title">{task.title}</span>
							<span class="meta">
								{person ? `${person.displayName} · ` : ''}{formatClock(new Date(task.completedAt!))}
								{#if task.repeat !== 'none'}
									· {describeRepeat(task.repeat)}{/if}
							</span>
						</span>
						<form method="POST" action="?/undo" use:enhance>
							<input type="hidden" name="taskId" value={task.id} />
							<button class="undo">Undo</button>
						</form>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
{/if}

<style>
	.day + .day {
		margin-top: var(--space-l);
	}

	.day-label {
		margin-bottom: var(--space-xs);
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	ul {
		margin: 0;
		padding: 0;
	}

	.past-task {
		display: flex;
		align-items: center;
		gap: var(--space-m);
		min-height: var(--row-height);
		list-style: none;
	}

	.ring {
		display: grid;
		place-items: center;
		flex: none;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--ring-colour);
		color: #14100d;
		opacity: 0.7;
	}

	.text {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.title {
		color: var(--colour-text-muted);
		text-decoration: line-through;
		text-decoration-color: rgb(245 237 230 / 0.3);
		overflow-wrap: anywhere;
	}

	.meta {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	form {
		margin: 0;
	}

	.undo {
		min-height: var(--tap-target);
		padding: 0 4px;
		border: 0;
		background: none;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.empty {
		color: var(--colour-text-muted);
	}
</style>
