<script lang="ts">
	/** The open tasks on Lists › Tasks, with a link to Past tasks. */
	import type { Profile, Task } from '#lib/types.js';
	import TaskRow from './TaskRow.svelte';

	interface Props {
		tasks: Task[];
		people: Profile[];
		today: string;
	}

	let { tasks, people, today }: Props = $props();
</script>

{#if tasks.length === 0}
	<p class="empty">Nothing to do. Add the next chore above.</p>
{:else}
	<p class="summary" aria-live="polite">{tasks.length} to do</p>
	<ul class="rows">
		{#each tasks as task (task.id)}
			<TaskRow {task} {people} {today} action="?/complete" editHref="/lists/tasks/{task.id}" />
		{/each}
	</ul>
{/if}

<p class="past-link"><a class="button-quiet" href="/lists/tasks/past">Past tasks</a></p>

<style>
	.rows {
		margin: 0;
		padding: 0;
	}

	.summary {
		margin: 28px 0 var(--space-xs);
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	.empty {
		margin-top: 28px;
		color: var(--colour-text-muted);
	}

	.past-link {
		margin-top: var(--space-l);
	}
</style>
