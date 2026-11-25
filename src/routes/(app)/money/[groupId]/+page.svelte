<script lang="ts">
	import ActivityRow from '#lib/features/expenses/ActivityRow.svelte';
	import { categoryColour } from '#lib/features/expenses/categories.js';
	import { formatMoney } from '#lib/features/expenses/money.js';
	import { frequencyLabel } from '#lib/features/expenses/recurring.js';
	import { formatDayLabel, todayISO } from '#lib/time.js';
	import {
		describeBetween,
		describeDebt,
		describeMyBalance,
		onlyOther
	} from '#lib/features/expenses/describe.js';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import RoundButton from '#lib/ui/RoundButton.svelte';
	import type { ExpenseActivity } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const me = $derived(data.me.id);
	const myNet = $derived(data.balances.find((b) => b.profileId === me)?.netCents ?? 0);
	const other = $derived(onlyOther(data.people, me));
	// Two people: one sentence says it all ("You owe Brenton $2.50"). More: your position, then
	// the fewest repayments that would settle the group.
	const headline = $derived(
		other ? describeBetween(myNet, other.displayName) : describeMyBalance(myNet)
	);
	// Debts involving you first, then the rest of the group.
	const debts = $derived(
		[...data.debts].sort(
			(a, b) => Number(b.from === me || b.to === me) - Number(a.from === me || a.to === me)
		)
	);

	const MONTHS = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	/** History in month sections, newest first. */
	const months = $derived.by(() => {
		const sections: { key: string; label: string; items: ExpenseActivity[] }[] = [];
		for (const item of data.activity) {
			const key = item.date.slice(0, 7);
			let section = sections.at(-1);
			if (section?.key !== key) {
				section = {
					key,
					label: `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`,
					items: []
				};
				sections.push(section);
			}
			section.items.push(item);
		}
		return sections;
	});
</script>

<svelte:head>
	<title>{data.group.name} · home base</title>
</svelte:head>

<PageHeader title={data.group.name}>
	{#snippet lead()}
		<a class="button-quiet" href="/money"><Icon name="back" size={18} /> Money</a>
	{/snippet}
	{#snippet action()}
		<RoundButton icon="plus" label="Add expense" href="/money/{data.group.id}/expenses/new" />
	{/snippet}
</PageHeader>

<GlassCard glow={myNet !== 0}>
	<div class="summary">
		<p class="headline" class:owed={myNet > 0}>{headline}</p>
		{#if debts.length > 0 && !other}
			<ul class="debts">
				{#each debts as debt (debt.from + debt.to)}
					<li>{describeDebt(debt, data.people, me)}</li>
				{/each}
			</ul>
		{:else if !other && debts.length === 0 && data.activity.length > 0}
			<p class="quiet">Nobody owes anything right now.</p>
		{/if}
		<div class="actions">
			<a class="button-primary" href="/money/{data.group.id}/expenses/new">Add expense</a>
			{#if debts.length > 0}
				<a class="button-secondary" href="/money/{data.group.id}/settle">Settle up</a>
			{/if}
		</div>
	</div>
</GlassCard>

<nav class="links" aria-label="Group">
	<a href="/money/{data.group.id}/reports">Reports</a>
	<a href="/money/{data.group.id}/settings">Group settings</a>
</nav>

{#if data.recurring.length}
	<!-- Bills that add themselves; each opens to change, pause or stop it. -->
	<section class="repeats" aria-labelledby="repeats-heading">
		<h2 id="repeats-heading" class="section-label caption-label">Repeats</h2>
		<ul class="grouped">
			{#each data.recurring as bill (bill.id)}
				<li>
					<a class="grouped-row" href="/money/{data.group.id}/recurring/{bill.id}">
						<span class="grouped-icon" style:--icon-colour={categoryColour(bill.category)}
							><Icon name="repeat" size={16} /></span
						>
						<span class="grouped-label"
							>{bill.description}<span class="grouped-sub"
								>{bill.paused
									? 'Paused'
									: `${frequencyLabel(bill.frequency)} · next ${formatDayLabel(bill.nextOn, todayISO())}`}</span
							></span
						>
						<span class="grouped-value">{formatMoney(bill.amountCents)}</span>
						<span class="grouped-chevron"><Icon name="chevron" size={16} /></span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if months.length === 0}
	<p class="empty">
		No expenses yet. Add the first one and everyone’s share is worked out for you.
	</p>
{:else}
	{#each months as month (month.key)}
		<section class="month" aria-labelledby="month-{month.key}">
			<h2 id="month-{month.key}" class="section-label caption-label">{month.label}</h2>
			<ul>
				{#each month.items as item (item.kind === 'expense' ? item.expense.id : item.settlement.id)}
					<ActivityRow {item} groupId={data.group.id} people={data.people} {me} />
				{/each}
			</ul>
		</section>
	{/each}
{/if}

<style>
	.repeats {
		margin-bottom: var(--space-xl);
	}

	.summary {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
	}

	.headline {
		font-size: 1.5rem;
		line-height: 1.15;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
	}

	.headline.owed {
		color: var(--colour-accent);
	}

	.debts {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 0;
		list-style: none;
		color: var(--colour-text-muted);
	}

	.quiet {
		color: var(--colour-text-muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: var(--space-s);
	}

	.actions > * {
		flex: 1;
		min-height: 46px;
		padding: 0 16px;
		white-space: nowrap;
	}

	.links {
		display: flex;
		gap: var(--space-l);
		margin: var(--space-m) 0 var(--space-s);
	}

	.links a {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
		text-decoration: none;
	}

	.empty {
		max-width: 32ch;
		margin-top: var(--space-l);
		color: var(--colour-text-muted);
	}

	.month {
		margin-top: var(--space-l);
	}

	.section-label {
		margin-bottom: var(--space-xs);
	}

	.month ul {
		margin: 0;
		padding: 0;
	}
</style>
