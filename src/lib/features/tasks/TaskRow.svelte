<script lang="ts">
	/** One task with its tick ring. Ticking it off pops a +1 point, then it moves to Past tasks. */
	import { describeRepeat, repeatLabel } from './repeat.js';
	import { enhance } from '$app/forms';
	import PointPop from '#lib/features/points/PointPop.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { formatDueLabel } from '#lib/time.js';
	import type { Profile, Task } from '#lib/types.js';

	interface Props {
		task: Task;
		people: Profile[];
		today: string;
		/** Form action that ticks it off, e.g. "?/complete". */
		action: string;
		/** Adds a trailing button to the edit page. */
		editHref?: string;
	}

	let { task, people, today, action, editHref }: Props = $props();

	// Ticked straight away; the row leaves for Past tasks once the server confirms.
	let ticking = $state(false);
	let pops = $state(0);

	const assignee = $derived(people.find((person) => person.id === task.assigneeId));
	const overdue = $derived(task.dueOn !== null && task.dueOn < today);
	const dueLabel = $derived(task.dueOn ? formatDueLabel(task.dueOn, today) : null);
	const label = $derived(
		[
			`Tick off ${task.title} for a point`,
			assignee ? assignee.displayName : 'anyone',
			dueLabel ? `due ${dueLabel.toLowerCase()}` : null,
			describeRepeat(task.repeat)
		]
			.filter(Boolean)
			.join(', ')
	);
</script>

<li class="task-row" class:ticking>
	<form
		method="POST"
		{action}
		use:enhance={() => {
			ticking = true;
			return async ({ result, update }) => {
				if (result.type === 'success') {
					// Let the point land before the row moves to Past tasks.
					pops += 1;
					await new Promise((resolve) => setTimeout(resolve, 650));
				}
				await update({ reset: false });
				ticking = false;
			};
		}}
	>
		<input type="hidden" name="taskId" value={task.id} />
		<input type="hidden" name="done" value="true" />
		<span class="pop-anchor"><PointPop count={pops} /></span>
		<button
			class="toggle"
			class:anyone={!assignee}
			aria-label={label}
			disabled={ticking}
			style:--ring-colour={assignee?.accentColour ?? 'var(--colour-text-faint)'}
		>
			<span class="ring"
				>{#if ticking}<Icon name="check" size={14} />{/if}</span
			>
			<span class="title">{task.title}</span>
			<span class="meta">
				{#if task.repeat !== 'none'}<span class="repeat" title={repeatLabel(task.repeat)}
						><Icon name="repeat" size={14} /></span
					>{/if}
				{#if dueLabel}<span class="due" class:overdue>{dueLabel}</span>{/if}
			</span>
		</button>
	</form>
	{#if editHref}
		<a class="edit" href={editHref} aria-label="Edit {task.title}"
			><Icon name="chevron" size={18} /></a
		>
	{/if}
</li>

<style>
	.task-row {
		display: flex;
		align-items: center;
		list-style: none;
		transition: opacity var(--duration-settle) var(--ease-out);
	}

	.ticking {
		opacity: 0.5;
	}

	form {
		position: relative;
		flex: 1;
		min-width: 0;
		margin: 0;
	}

	/* The +1 rises from the ring. */
	.pop-anchor {
		position: absolute;
		left: 12px;
		top: 50%;
		width: 0;
		height: 0;
	}

	/* The whole row is the target; the ring colour says whose it is. */
	.toggle {
		display: flex;
		align-items: center;
		gap: var(--space-m);
		width: 100%;
		min-height: var(--row-height);
		padding: 0;
		border: 0;
		background: none;
		text-align: left;
	}

	.toggle:disabled {
		cursor: default;
	}

	.ring {
		display: grid;
		place-items: center;
		flex: none;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid var(--ring-colour);
		color: #14100d;
		transition:
			background-color var(--duration-quick) var(--ease-out),
			transform var(--duration-quick) var(--ease-spring);
	}

	/* Anyone: a dashed ring. */
	.anyone .ring {
		border-style: dashed;
	}

	.toggle:active .ring {
		transform: scale(0.88);
	}

	.ticking .ring {
		border-style: solid;
		background: var(--ring-colour);
	}

	.ticking .anyone .ring {
		background: var(--colour-text-muted);
		border-color: transparent;
	}

	.title {
		flex: 1;
		min-width: 0;
		font-size: var(--text-body);
		overflow-wrap: anywhere;
	}

	.ticking .title {
		text-decoration: line-through;
		text-decoration-color: rgb(245 237 230 / 0.3);
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: none;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.repeat {
		display: grid;
		color: var(--colour-text-faint);
	}

	.due.overdue {
		color: var(--colour-accent);
	}

	.edit {
		display: grid;
		place-items: center;
		flex: none;
		width: var(--tap-target);
		height: var(--tap-target);
		margin-right: -12px;
		color: var(--colour-text-faint);
	}
</style>
