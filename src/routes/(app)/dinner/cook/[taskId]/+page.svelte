<script lang="ts">
	import { enhance } from '$app/forms';
	import IngredientList from '#lib/features/recipes/IngredientList.svelte';
	import MethodSteps from '#lib/features/recipes/MethodSteps.svelte';
	import ScheduleForm from '#lib/features/recipes/ScheduleForm.svelte';
	import Stars from '#lib/features/recipes/Stars.svelte';
	import ActionDock from '#lib/ui/ActionDock.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';
	import { formatDinnerWhen } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const task = $derived(data.task);
	const recipe = $derived(task.recipe!);
	const cook = $derived(data.household.members.find((person) => person.id === task.assigneeId));
	const cookedBy = $derived(
		data.household.members.find((person) => person.id === task.completedBy)
	);
	const when = $derived(formatDinnerWhen(task.dueOn!, task.dueTime, data.today));

	let rescheduling = $state(false);
	let busy = $state(false);

	// Skip takes two taps: the first asks, the second takes the dinner off the calendar.
	let skipArmed = $state(false);
	let skipTimer: ReturnType<typeof setTimeout> | undefined;
	function armSkip(event: MouseEvent) {
		if (skipArmed) return;
		event.preventDefault();
		skipArmed = true;
		clearTimeout(skipTimer);
		skipTimer = setTimeout(() => (skipArmed = false), 4000);
	}

	const submit = () => {
		busy = true;
		return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			busy = false;
		};
	};
</script>

<svelte:head>
	<title>{task.title} · home base</title>
</svelte:head>

<PageHeader title={task.title}>
	{#snippet lead()}
		<a class="button-quiet" href="/"><Icon name="back" size={18} /> Today</a>
	{/snippet}
</PageHeader>

<div class="cook">
	<dl class="facts">
		<div>
			<dt>When</dt>
			<dd>{when}</dd>
		</div>
		<div>
			<dt>Cooking</dt>
			<dd class="who">
				{#if cook}<Avatar person={cook} size={20} dot />
					{cook.id === data.me.id ? 'You' : cook.displayName}{:else}Anyone{/if}
			</dd>
		</div>
		<div>
			<dt>Serves</dt>
			<dd>{task.servings}</dd>
		</div>
	</dl>

	{#if task.completedAt}
		<section class="done" aria-label="Cooked">
			<p>
				<Icon name="check" size={18} />
				Cooked{cookedBy ? ` by ${cookedBy.id === data.me.id ? 'you' : cookedBy.displayName}` : ''}.
				How was it?
			</p>
			<form method="POST" action="?/rate" use:enhance={submit}>
				<Stars value={data.stars} name="stars" label={recipe.title} size={24} autosubmit />
			</form>
		</section>
	{/if}

	<a class="recipe-link" href="/dinner/{task.recipeId}">
		See {recipe.title} in the cookbook <Icon name="chevron" size={16} />
	</a>

	<section aria-labelledby="ingredients">
		<h2 id="ingredients">Ingredients <span class="for">for {task.servings}</span></h2>
		<IngredientList ingredients={recipe.ingredients} tickable />
	</section>

	<section aria-labelledby="method">
		<h2 id="method">Method</h2>
		<MethodSteps steps={recipe.steps} />
	</section>
</div>

{#if !task.completedAt}
	<ActionDock>
		<form method="POST" action="?/skip" use:enhance={submit}>
			<button
				class="button-quiet skip"
				class:armed={skipArmed}
				onclick={armSkip}
				disabled={busy}
				aria-live="polite"
			>
				{skipArmed ? 'Skip it?' : 'Skip'}
			</button>
		</form>
		<button type="button" class="button-secondary act" onclick={() => (rescheduling = true)}>
			Reschedule
		</button>
		<form method="POST" action="?/cooked" class="grow" use:enhance={submit}>
			<button class="button-primary act" disabled={busy}>
				<Icon name="check" size={18} /> Mark as cooked
			</button>
		</form>
	</ActionDock>

	<Sheet open={rescheduling} title="Move dinner" onclose={() => (rescheduling = false)}>
		<ScheduleForm
			action="?/reschedule"
			people={data.household.members}
			today={data.today}
			values={{ dueOn: task.dueOn, dueTime: task.dueTime, assigneeId: task.assigneeId }}
			submitLabel="Move it"
			onsaved={() => (rescheduling = false)}
		/>
	</Sheet>
{/if}

<style>
	.cook {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
		padding-bottom: 84px;
	}

	h2 {
		margin: 0 0 var(--space-m);
		font-size: var(--text-body);
		font-weight: var(--weight-strong);
	}

	.for {
		margin-left: 6px;
		color: var(--colour-text-muted);
		font-size: var(--text-small);
		font-weight: 400;
	}

	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-l);
		margin: calc(-1 * var(--space-m)) 0 0;
	}

	.facts div {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	dt {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	dd {
		margin: 0;
		font-weight: var(--weight-medium);
	}

	.who {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.done {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: var(--space-m);
		border-radius: 22px;
		background: var(--colour-accent-soft);
		box-shadow: inset 0 0 0 1px var(--colour-accent-edge);
	}

	.done p {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
	}

	.done p :global(svg) {
		color: var(--colour-accent);
	}

	.done form {
		margin: 0 0 0 -7px;
	}

	.recipe-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		align-self: flex-start;
		min-height: var(--tap-target);
		margin: calc(-1 * var(--space-m)) 0 -6px;
		color: var(--colour-text-muted);
		font-size: var(--text-small);
		text-decoration: none;
	}

	.grow {
		flex: 1;
		min-width: 0;
	}

	.grow .act {
		width: 100%;
	}

	.button-primary.act {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.button-secondary.act {
		width: auto;
	}

	.skip {
		padding: 0 8px;
	}

	.skip.armed {
		color: var(--colour-accent);
		font-weight: var(--weight-medium);
	}
</style>
