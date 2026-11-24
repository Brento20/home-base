<script lang="ts">
	/** A chore card in Today's row, with a Done button that earns a point. */
	import { repeatLabel } from '#lib/features/tasks/repeat.js';
	import Avatar from '#lib/ui/Avatar.svelte';
	import { enhance } from '$app/forms';
	import PointPop from '#lib/features/points/PointPop.svelte';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { canFinish as finishable, taskWhen } from './coming-up.js';
	import type { Profile, Task } from '#lib/types.js';

	interface Props {
		task: Task;
		people: Profile[];
		today: string;
		highlighted?: boolean;
		label?: string;
		/** Called once the chore is ticked off, so the row can take the card out. */
		ondone?: (id: string) => void;
	}

	let { task, people, today, highlighted = false, label, ondone }: Props = $props();

	let done = $state(false);
	let pops = $state(0);

	const assignee = $derived(people.find((person) => person.id === task.assigneeId));
	const dinner = $derived(Boolean(task.recipe));
	const canFinish = $derived(finishable(task, today));
	const due = $derived(taskWhen(task, today));
	const when = $derived(due.label);
</script>

<div class="task-card" class:highlighted class:done>
	<GlassSurface radius={28} squish />
	<a
		class="cover"
		href={dinner ? `/dinner/cook/${task.id}` : `/lists/tasks/${task.id}`}
		aria-label={label ?? task.title}
	></a>
	<div class="body">
		<span class="when caption-label" class:late={due.late}>
			{dinner ? 'Dinner' : 'Chore'} · {when}
			{#if task.repeat !== 'none'}<span class="repeat" title={repeatLabel(task.repeat)}
					><Icon name="repeat" size={13} /></span
				>{/if}
		</span>
		<span class="title">{task.title}</span>
		<span class="footer">
			<span class="who">
				{#if assignee}
					<Avatar person={assignee} size={20} dot />
				{:else}
					<span class="dot anyone"></span>
				{/if}
				{assignee ? assignee.displayName : 'Anyone'}{dinner ? ' cooking' : ''}
			</span>
			{#if canFinish}<form
					method="POST"
					action="?/completeTask"
					use:enhance={() => {
						done = true;
						return async ({ result, update }) => {
							if (result.type === 'success') {
								// Show the point landing before the card leaves the row.
								pops += 1;
								await new Promise((resolve) => setTimeout(resolve, 700));
								ondone?.(task.id);
							} else {
								done = false;
							}
							await update({ reset: false });
						};
					}}
				>
					<input type="hidden" name="taskId" value={task.id} />
					<input type="hidden" name="title" value={task.title} />
					<PointPop count={pops} />
					<button
						class="done-button"
						aria-label={dinner
							? `Mark ${task.title} as cooked, earns a point`
							: `Tick off ${task.title}, earns a point`}
						disabled={done}
					>
						<Icon name="check" size={18} />
					</button>
				</form>{/if}
		</span>
	</div>
</div>

<style>
	.task-card {
		--highlight-speed: 450ms;
		position: relative;
		height: 100%;
		border-radius: var(--radius-card);
		-webkit-touch-callout: none;
	}

	.when,
	.title,
	.who {
		transition: opacity var(--duration-settle) var(--ease-out);
	}

	/* Ticked: the words fade, the button and its +1 stay bright. */
	.done .when,
	.done .title,
	.done .who {
		opacity: 0.45;
	}

	/*
	 * The whole card opens the chore. The text layer sits above this link but lets taps
	 * through to it; only the Done button inside takes taps itself.
	 */
	.cover {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: inherit;
	}

	.body {
		position: relative;
		z-index: 2;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 18px 22px 16px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
		transition: box-shadow var(--highlight-speed) var(--ease-out);
	}

	.body::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: inherit;
		background: linear-gradient(180deg, var(--colour-accent-soft), transparent 70%);
		opacity: 0;
		transition: opacity var(--highlight-speed) var(--ease-out);
		pointer-events: none;
	}

	.highlighted .body {
		box-shadow:
			inset 0 0 0 1px var(--colour-accent-edge),
			var(--glass-highlight);
	}

	.highlighted .body::before {
		opacity: 1;
	}

	.when {
		display: flex;
		align-items: center;
		gap: 6px;
		transition: color var(--highlight-speed) var(--ease-out);
	}

	.highlighted .when,
	.when.late {
		color: var(--colour-accent);
	}

	.repeat {
		display: grid;
		opacity: 0.8;
	}

	.title {
		margin-top: 10px;
		font-size: 1.625rem;
		line-height: 1.08;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.done .title {
		text-decoration: line-through;
		text-decoration-color: var(--colour-strike);
	}

	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-m);
		margin-top: auto;
		padding-top: 12px;
	}

	.who {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	/* Anyone: an empty dashed dot. */
	.dot.anyone {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1.5px dashed var(--colour-text-faint);
	}

	form {
		position: relative;
		margin: 0;
		pointer-events: auto;
	}

	.done-button {
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		border: 1.5px solid var(--colour-accent-edge);
		border-radius: 50%;
		background: var(--colour-well);
		color: var(--colour-accent);
		transition:
			background-color var(--duration-quick) var(--ease-out),
			transform var(--duration-release) var(--spring-gentle);
	}

	.done-button:global([data-pressed]) {
		transform: scale(0.88);
		background-color: var(--colour-accent-soft);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}

	.done .done-button {
		background: var(--colour-accent);
		color: var(--colour-on-accent);
	}
</style>
