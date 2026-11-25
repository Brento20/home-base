<script lang="ts">
	/**
	 * Today's coming-up as a compact list, for anyone who's chosen it over the big cards (display
	 * preferences). The same items in the same order, each a slim row: an icon for what it is,
	 * the title, one line of when and who, and its action. A chore or a dinner whose day has come
	 * gets the same tick as its card (and the same +1); a plan opens. Overdue chores say so in
	 * the accent, as on the cards.
	 */
	import { enhance } from '$app/forms';
	import { describePlanWhen } from '#lib/features/plans/describe.js';
	import PointPop from '#lib/features/points/PointPop.svelte';
	import { repeatLabel } from '#lib/features/tasks/repeat.js';
	import Icon from '#lib/ui/Icon.svelte';
	import { planIcon, taskIcon } from '#lib/icons/meaning.js';
	import { arrive, glide, leave } from '#lib/ui/motion.js';
	import type { Profile } from '#lib/types.js';
	import { canFinish, taskWhen, type ComingUpItem } from './coming-up.js';

	interface Props {
		items: ComingUpItem[];
		people: Profile[];
		today: string;
		/** Called once a chore is ticked off, so it can leave the list. */
		ondone?: (id: string) => void;
	}

	let { items, people, today, ondone }: Props = $props();

	/** Ticked here and waiting to leave, and the +1 to show on each. */
	let ticking = $state<string[]>([]);
	let pops = $state<Record<string, number>>({});

	const nameOf = (id: string | null) =>
		people.find((person) => person.id === id)?.displayName ?? 'Anyone';
</script>

<ul class="grouped coming-list" aria-label="Coming up">
	{#each items as item (item.id)}
		<li class="row" in:arrive={{ y: 8 }} out:leave animate:glide>
			{#if item.kind === 'plan'}
				{@const plan = item.plan}
				<a class="grouped-row link" href="/plans/{plan.id}">
					<span class="icon plan" aria-hidden="true"
						><Icon name={planIcon(plan) ?? 'plans'} size={16} /></span
					>
					<span class="grouped-label">
						<span class="title">{plan.title}</span>
						<span class="grouped-sub"
							>{describePlanWhen(plan, today)}{plan.location ? ` · ${plan.location}` : ''}</span
						>
					</span>
					<span class="grouped-chevron"><Icon name="chevron" size={16} /></span>
				</a>
			{:else}
				{@const task = item.task}
				{@const due = taskWhen(task, today)}
				{@const dinner = Boolean(task.recipe)}
				<div class="grouped-row" class:done={ticking.includes(task.id)}>
					<a
						class="link cover"
						href={dinner ? `/dinner/cook/${task.id}` : `/lists/tasks/${task.id}`}
					>
						<span class="icon" class:dinner aria-hidden="true"
							><Icon name={taskIcon(task) ?? 'lists'} size={16} /></span
						>
						<span class="grouped-label">
							<span class="title"
								>{task.title}{#if task.repeat !== 'none'}<span
										class="repeat"
										title={repeatLabel(task.repeat)}><Icon name="repeat" size={12} /></span
									>{/if}</span
							>
							<span class="grouped-sub">
								<span class:late={due.late}>{dinner ? 'Dinner' : 'Chore'} · {due.label}</span>
								· {nameOf(task.assigneeId)}{dinner ? ' cooking' : ''}
							</span>
						</span>
					</a>
					{#if canFinish(task, today)}
						<form
							method="POST"
							action="?/completeTask"
							use:enhance={() => {
								ticking = [...ticking, task.id];
								return async ({ result, update }) => {
									if (result.type === 'success') {
										pops = { ...pops, [task.id]: (pops[task.id] ?? 0) + 1 };
										// The +1 lands before the row leaves, as on the card.
										await new Promise((resolve) => setTimeout(resolve, 700));
										ondone?.(task.id);
									} else {
										ticking = ticking.filter((id) => id !== task.id);
									}
									await update({ reset: false });
								};
							}}
						>
							<input type="hidden" name="taskId" value={task.id} />
							<input type="hidden" name="title" value={task.title} />
							<PointPop count={pops[task.id] ?? 0} />
							<button
								class="tick"
								data-haptic
								aria-label={dinner
									? `Mark ${task.title} as cooked, earns a point`
									: `Tick off ${task.title}, earns a point`}
								disabled={ticking.includes(task.id)}><Icon name="check" size={16} /></button
							>
						</form>
					{/if}
				</div>
			{/if}
		</li>
	{/each}
</ul>

<style>
	/* Hairlines start at the text, past the icon (16 + 30 + 12). */
	.coming-list {
		--grouped-inset: 58px;
		margin: 0;
	}

	.row {
		list-style: none;
	}

	.link {
		color: inherit;
		text-decoration: none;
	}

	/* A chore row: the text opens it, the tick on the right takes its own taps. */
	.cover {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}

	a.grouped-row {
		gap: 12px;
	}

	.icon {
		display: grid;
		flex: none;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 9px;
		background: var(--colour-fill-strong);
		color: var(--colour-text-muted);
	}

	.icon.plan {
		background: var(--colour-accent-soft);
		color: var(--colour-accent);
	}

	.icon.dinner {
		color: var(--colour-dinner);
	}

	.title {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.repeat {
		display: inline-flex;
		margin-left: 6px;
		color: var(--colour-text-faint);
		vertical-align: -1px;
	}

	.grouped-sub {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Overdue, in the accent as on the cards. */
	.late {
		color: var(--colour-accent);
	}

	form {
		position: relative;
		flex: none;
		margin: 0;
	}

	/* A full 44px target around a 30px ring. */
	.tick {
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		margin-right: -6px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--colour-text-faint);
	}

	.tick > :global(svg) {
		box-sizing: content-box;
		padding: 6px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1.5px var(--colour-hairline-strong);
		transition:
			background-color var(--duration-quick) var(--ease-out),
			color var(--duration-quick) var(--ease-out);
	}

	.done .tick > :global(svg) {
		background: var(--colour-accent);
		color: var(--colour-on-accent);
		box-shadow: none;
	}

	.done .cover {
		opacity: 0.45;
		transition: opacity var(--duration-settle) var(--ease-out);
	}
</style>
