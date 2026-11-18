<script lang="ts">
	/**
	 * The one small card at the top of Plan dinner. A dinner that's been cooked asks how it was
	 * (stars, or Not now). A dinner whose time has passed but is still open asks whether you made
	 * it first: Yes (then it asks how it was), Reschedule or Skip.
	 */
	import { enhance } from '$app/forms';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';
	import { formatDinnerWhen, formatTimeOfDay } from '#lib/time.js';
	import type { Profile, Task } from '#lib/types.js';
	import { inSentence } from './recipe.js';
	import ScheduleForm from './ScheduleForm.svelte';
	import Stars from './Stars.svelte';

	interface Props {
		kind: 'rate' | 'confirm';
		task: Task;
		stars: number | null;
		people: Profile[];
		meId: string;
		today: string;
	}

	let { kind, task, stars, people, meId, today }: Props = $props();

	const dish = $derived(inSentence(task.recipe!.title));
	const cook = $derived(people.find((person) => person.id === task.assigneeId));
	// "last night", "tonight", "on Thursday"
	const day = $derived.by(() => {
		const label = formatDinnerWhen(task.dueOn!, null, today);
		return ['Tonight', 'Last night', 'Tomorrow'].includes(label)
			? label.toLowerCase()
			: `on ${label}`;
	});
	const cookedBy = $derived(people.find((person) => person.id === task.completedBy) ?? cook);
	const nameOf = (person: Profile) => (person.id === meId ? 'you' : person.displayName);

	let rescheduling = $state(false);
	let busy = $state(false);
	const submit = () => {
		busy = true;
		return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			busy = false;
		};
	};
</script>

<section class="prompt" aria-live="polite">
	<GlassSurface radius={24} glow />
	<div class="body">
		{#if kind === 'rate'}
			<h2>How was the {dish}?</h2>
			<p>
				{cookedBy
					? `${cookedBy.id === meId ? 'You' : cookedBy.displayName} cooked it ${day}.`
					: `Cooked ${day}.`}
			</p>
			<form method="POST" action="?/rate" class="rate" use:enhance={submit}>
				<input type="hidden" name="taskId" value={task.id} />
				<input type="hidden" name="recipeId" value={task.recipeId} />
				<Stars value={stars} name="stars" label={task.recipe!.title} size={26} autosubmit />
			</form>
			<form method="POST" action="?/dismiss" use:enhance={submit}>
				<input type="hidden" name="taskId" value={task.id} />
				<button class="button-quiet later" disabled={busy}>Not now</button>
			</form>
		{:else}
			<h2>Did you make the {dish}?</h2>
			<p>
				It was planned for {day}{task.dueTime ? ` at ${formatTimeOfDay(task.dueTime)}` : ''}{cook
					? `, with ${nameOf(cook)} cooking`
					: ''}.
			</p>
			<div class="choices">
				<form method="POST" action="?/cooked" use:enhance={submit}>
					<input type="hidden" name="taskId" value={task.id} />
					<button class="button-primary small" disabled={busy}>Yes</button>
				</form>
				<button type="button" class="button-secondary small" onclick={() => (rescheduling = true)}>
					Reschedule
				</button>
				<form method="POST" action="?/skip" use:enhance={submit}>
					<input type="hidden" name="taskId" value={task.id} />
					<button class="button-quiet" disabled={busy}>Skip</button>
				</form>
			</div>
		{/if}
	</div>
</section>

{#if kind === 'confirm'}
	<Sheet open={rescheduling} title="Move dinner" onclose={() => (rescheduling = false)}>
		<ScheduleForm
			action="?/reschedule"
			{people}
			{today}
			hidden={{ taskId: task.id }}
			values={{ dueOn: today, dueTime: task.dueTime, assigneeId: task.assigneeId }}
			submitLabel="Move it"
			onsaved={() => (rescheduling = false)}
		/>
	</Sheet>
{/if}

<style>
	.prompt {
		position: relative;
		margin-bottom: var(--space-l);
		border-radius: 24px;
	}

	.body {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 18px 18px 14px;
	}

	h2 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: var(--weight-strong);
		line-height: 1.3;
	}

	p {
		margin: 4px 0 var(--space-s);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.rate {
		margin-left: -8px;
	}

	.later {
		margin-top: 2px;
	}

	.choices {
		display: flex;
		align-items: center;
		gap: var(--space-s);
		margin-top: var(--space-xs, 4px);
	}

	.small {
		min-height: 42px;
		padding: 0 18px;
		font-size: var(--text-small);
	}

	form {
		margin: 0;
	}
</style>
