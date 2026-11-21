<script lang="ts">
	/**
	 * A task's details, read-only: the same shape as a plan's page. Edit (top right) opens the
	 * form; ticking it off and deleting are here, as everywhere else.
	 */
	import { enhance } from '$app/forms';
	import { repeatLabel } from '#lib/features/tasks/repeat.js';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { daysBetween, formatLongDate, zonedParts } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const task = $derived(data.task);
	const people = $derived(data.household.members);
	const assignee = $derived(people.find((person) => person.id === task.assigneeId));
	const nameOf = (id: string | null) => people.find((person) => person.id === id)?.displayName;

	const overdue = $derived(!task.completedAt && !!task.dueOn && task.dueOn < data.today);
	// "Due today", "Due in 3 days", "2 days overdue": the line above the title.
	const status = $derived.by(() => {
		if (task.completedAt) return 'Done';
		if (!task.dueOn) return 'No due date';
		if (overdue) {
			const late = daysBetween(task.dueOn, data.today);
			return late === 1 ? 'Overdue since yesterday' : `${late} days overdue`;
		}
		// The Due line below has the date, so this one says how soon.
		const away = daysBetween(data.today, task.dueOn);
		return away === 0 ? 'Due today' : away === 1 ? 'Due tomorrow' : `Due in ${away} days`;
	});
	const repeats = $derived(repeatLabel(task.repeat));
	const doneOn = $derived(task.completedAt ? zonedParts(new Date(task.completedAt)).date : null);

	let working = $state(false);
</script>

<svelte:head>
	<title>{task.title} · home base</title>
</svelte:head>

<nav class="top-bar" aria-label="Task">
	<a class="button-quiet back" href="/lists/tasks"><Icon name="back" size={18} /> Tasks</a>
	<a class="button-edit" href="/lists/tasks/{task.id}/edit">Edit</a>
</nav>

<article class="summary">
	<header class="hero">
		<GlassSurface radius={28} />
		<div class="hero-body">
			<p class="status" class:overdue class:done={!!task.completedAt}>{status}</p>
			<h1>{task.title}</h1>
			<p class="who">
				<span
					class="ring"
					class:anyone={!assignee}
					style:--ring-colour={assignee?.accentColour ?? 'var(--colour-text-faint)'}
					aria-hidden="true"
				></span>
				{assignee ? assignee.displayName : 'Anyone'}
			</p>
		</div>
	</header>

	<!-- Label left, value right, on one panel, as in an event's details in Calendar. -->
	<dl class="grouped details">
		<div class="grouped-row">
			<dt class="grouped-label">Due</dt>
			<dd class="grouped-value" class:late={overdue}>
				{task.dueOn ? formatLongDate(task.dueOn, data.today) : 'Whenever'}
			</dd>
		</div>
		<div class="grouped-row">
			<dt class="grouped-label">Repeats</dt>
			<dd class="grouped-value">{repeats || 'Never'}</dd>
		</div>
		{#if task.completedAt && doneOn}
			<div class="grouped-row">
				<dt class="grouped-label">Ticked off</dt>
				<dd class="grouped-value">
					{formatLongDate(doneOn, data.today)}{#if nameOf(task.completedBy)}
						by {nameOf(task.completedBy)}{/if}
				</dd>
			</div>
		{/if}
		{#if nameOf(task.createdBy)}
			<div class="grouped-row">
				<dt class="grouped-label">Added by</dt>
				<dd class="grouped-value">{nameOf(task.createdBy)}</dd>
			</div>
		{/if}
	</dl>

	<form
		method="POST"
		action={task.completedAt ? '?/reopen' : '?/complete'}
		use:enhance={() => {
			working = true;
			return async ({ update }) => {
				await update({ reset: false });
				working = false;
			};
		}}
	>
		{#if task.completedAt}
			<button class="button-secondary" disabled={working}>
				{working ? 'Putting it back…' : 'Put it back on the list'}
			</button>
		{:else}
			<button class="button-primary" disabled={working}>
				<Icon name="check" size={18} />
				{working ? 'Ticking off…' : 'Tick it off'}
			</button>
		{/if}
	</form>
</article>

<ConfirmDelete action="?/delete" label="Delete task" />

<style>
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: -10px -4px var(--space-l) -4px;
	}

	.summary {
		display: flex;
		flex-direction: column;
		gap: var(--space-l);
	}

	.hero {
		position: relative;
		border-radius: var(--radius-card);
	}

	.hero-body {
		position: relative;
		z-index: 1;
		padding: 24px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
	}

	.status {
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	.status.overdue {
		color: var(--colour-danger);
	}

	h1 {
		margin-top: 8px;
		font-size: var(--text-event-title);
		line-height: 1.08;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		overflow-wrap: anywhere;
	}

	.done ~ h1 {
		color: var(--colour-text-muted);
	}

	.who {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 14px;
		font-size: var(--text-body);
	}

	/* The same ring as the task's row: their colour, dashed for anyone. */
	.ring {
		flex: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid var(--ring-ink);
	}

	.ring.anyone {
		border-style: dashed;
	}

	/* <dl> rows: separators drawn the grouped way, by sibling, since these aren't <li>s. */
	.details > .grouped-row + .grouped-row {
		box-shadow: inset 0 1px var(--colour-hairline);
		background-clip: padding-box;
	}

	.details .grouped-row {
		min-height: 50px;
	}

	dt {
		color: var(--colour-text-muted);
	}

	dd {
		margin: 0;
		max-width: 65%;
		color: var(--colour-text);
		text-align: right;
	}

	dd.late {
		color: var(--colour-danger);
	}

	form {
		margin: 0;
	}

	form button {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
</style>
