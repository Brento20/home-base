<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { EMPTY } from '#lib/copy/voice.js';
	import { groupPlansByDay } from '#lib/features/plans/describe.js';
	import PlanRow from '#lib/features/plans/PlanRow.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import RoundButton from '#lib/ui/RoundButton.svelte';
	import type { Plan } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Said a little differently each visit (src/lib/copy/voice.ts).
	const emptyLine = pick(EMPTY.plans);

	const groups = $derived(groupPlansByDay(data.plans, data.today));

	const isOver = (plan: Plan) =>
		!plan.allDay && new Date(plan.endsAt ?? plan.startsAt).getTime() < new Date(data.now).getTime();
</script>

<svelte:head>
	<title>Plans · home base</title>
</svelte:head>

<PageHeader title="Plans">
	{#snippet action()}
		<RoundButton icon="plus" label="New plan" href="/plans/new" />
	{/snippet}
</PageHeader>

{#if groups.length === 0}
	<div class="empty">
		<p>{emptyLine}</p>
		<a class="button-quiet" href="/plans/import">Import from Apple Calendar</a>
	</div>
{:else}
	{#each groups as group (group.day)}
		<section class="day" aria-labelledby="day-{group.day}">
			<h2 id="day-{group.day}" class="day-label">{group.label}</h2>
			<ul>
				{#each group.plans as plan (plan.id)}
					<PlanRow {plan} past={isOver(plan)} />
				{/each}
			</ul>
		</section>
	{/each}
	<p class="footer"><a class="button-quiet" href="/plans/import">Import from Apple Calendar</a></p>
{/if}

<style>
	.day + .day {
		margin-top: 28px;
	}

	.day-label {
		margin: 0 0 10px 4px;
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
		padding: 0;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-s);
		color: var(--colour-text-muted);
	}

	.footer {
		margin-top: var(--space-xl);
	}
</style>
