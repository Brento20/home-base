<script lang="ts">
	/**
	 * One task: tap the circle to tick it off (a +1 point pops, then it moves to Past tasks), or
	 * anywhere else on the row to open it.
	 */
	import { describeRepeat, repeatLabel } from './repeat.js';
	import { enhance } from '$app/forms';
	import PointPop from '#lib/features/points/PointPop.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { arrive, changed, leave } from '#lib/ui/motion.js';
	import { formatDueLabel } from '#lib/time.js';
	import type { Profile, Task } from '#lib/types.js';

	interface Props {
		task: Task;
		people: Profile[];
		today: string;
		/** Form action that ticks it off, e.g. "?/complete". */
		action: string;
		/** Where tapping the task's name goes: its page, with all its details. */
		openHref?: string;
		/** Leave the date off when the section heading already says it (Today, Tomorrow). */
		hideDue?: boolean;
	}

	let { task, people, today, action, openHref, hideDue = false }: Props = $props();

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

<li
	class="task-row"
	class:ticking
	in:arrive
	out:leave
	use:changed={`${task.title}|${task.assigneeId}|${task.dueOn}|${task.dueTime}|${task.repeat}`}
>
	<!-- Only the circle ticks it off; the rest of the row opens the task. -->
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
		<input type="hidden" name="title" value={task.title} />
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
		</button>
	</form>
	<svelte:element this={openHref ? 'a' : 'div'} class="open" href={openHref}>
		<span class="words">
			<span class="title">{task.title}</span>
			<!-- Says whose it is in words too, so the ring colour isn't the only clue. -->
			<span class="who">{assignee ? assignee.displayName : 'Anyone'}</span>
		</span>
		<span class="meta">
			{#if task.repeat !== 'none'}<span class="repeat" title={repeatLabel(task.repeat)}
					><Icon name="repeat" size={14} /></span
				>{/if}
			{#if dueLabel && !hideDue}<span class="due" class:overdue>{dueLabel}</span>{/if}
		</span>
	</svelte:element>
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
		flex: none;
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

	/* Just the circle, with a full-height tap area that reaches the row's left edge. */
	.toggle {
		display: grid;
		place-items: center start;
		width: calc(24px + var(--space-m));
		min-height: var(--row-height);
		padding: 0;
		border: 0;
		background: none;
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
		border: 2px solid var(--ring-ink);
		color: var(--colour-on-ring);
		transition:
			background-color var(--duration-quick) var(--ease-out),
			transform var(--duration-release) var(--spring-gentle);
	}

	/* Anyone: a dashed ring. */
	.anyone .ring {
		border-style: dashed;
	}

	.toggle:global([data-pressed]) .ring {
		transform: scale(0.86);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}

	.ticking .ring {
		border-style: solid;
		background: var(--ring-ink);
	}

	.ticking .anyone .ring {
		background: var(--colour-text-muted);
		border-color: transparent;
	}

	/* Everything after the circle: opens the task. */
	.open {
		display: flex;
		align-items: center;
		gap: var(--space-s);
		flex: 1;
		min-width: 0;
		min-height: var(--row-height);
		padding-right: 2px;
		color: inherit;
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
		transition: opacity var(--duration-quick) var(--ease-out);
	}

	a.open:global([data-pressed]) {
		opacity: 0.6;
	}

	.words {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		padding: 8px 0;
	}

	.title {
		font-size: var(--text-body);
		overflow-wrap: anywhere;
	}

	.who {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.ticking .title {
		text-decoration: line-through;
		text-decoration-color: var(--colour-strike);
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

	/* Late is red, as in Reminders. */
	.due.overdue {
		color: var(--colour-danger);
	}
</style>
