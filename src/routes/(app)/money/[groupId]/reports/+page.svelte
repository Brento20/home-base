<script lang="ts">
	import { page } from '$app/state';
	import CategoryBars from '#lib/features/expenses/CategoryBars.svelte';
	import CompareBars from '#lib/features/expenses/CompareBars.svelte';
	import TrendChart from '#lib/features/expenses/TrendChart.svelte';
	import { categoryColour, categoryLabel } from '#lib/features/expenses/categories.js';
	import { nameOf } from '#lib/features/expenses/describe.js';
	import { formatMoney } from '#lib/features/expenses/money.js';
	import {
		describeChange,
		describeRange,
		isWholeMonth,
		shiftMonth,
		type ReportExpense
	} from '#lib/features/expenses/report.js';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const base = $derived(`/money/${data.group.id}/reports`);

	/** This page's URL with some query values changed (null removes one). */
	function hrefWith(changes: Record<string, string | null>) {
		const params = new URLSearchParams(page.url.search);
		for (const [key, value] of Object.entries(changes)) {
			if (value === null) params.delete(key);
			else params.set(key, value);
		}
		const query = params.toString();
		return query ? `${base}?${query}` : base;
	}

	const categoryHref = (key: string | null) => hrefWith({ category: key });
	const shortDate = (dateISO: string) =>
		new Date(`${dateISO}T00:00:00Z`).toLocaleDateString('en-AU', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});
	const count = (n: number) => `${n} ${n === 1 ? 'expense' : 'expenses'}`;
</script>

<svelte:head>
	<title>Reports · {data.group.name} · home base</title>
</svelte:head>

<PageHeader title="Reports">
	{#snippet lead()}
		<a class="button-quiet" href="/money/{data.group.id}"
			><Icon name="back" size={18} /> {data.group.name}</a
		>
	{/snippet}
</PageHeader>

<nav class="modes" aria-label="Report type">
	<a href={base} aria-current={data.mode === 'overview' ? 'page' : undefined}>Overview</a>
	<a href="{base}?mode=compare" aria-current={data.mode === 'compare' ? 'page' : undefined}
		>Compare</a
	>
</nav>

{#snippet drillList(expenses: ReportExpense[])}
	{#if expenses.length === 0}
		<p class="quiet">Nothing in this category.</p>
	{:else}
		<ul class="drill">
			{#each expenses as expense (expense.id)}
				<li>
					<a href="/money/{data.group.id}/expenses/{expense.id}">
						<span class="drill-date">{shortDate(expense.spentOn)}</span>
						<span class="drill-text">
							<span>{expense.description}</span>
							<span class="drill-meta">{nameOf(data.people, expense.paidBy, data.me.id)} paid</span>
						</span>
						<span class="drill-amount">{formatMoney(expense.amountCents)}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

{#if data.mode === 'overview'}
	{@const { report } = data}
	{@const whole = isWholeMonth(report.range)}
	<div class="period">
		{#if whole}
			{@const previous = shiftMonth(report.range, -1)}
			{@const next = shiftMonth(report.range, 1)}
			<a
				class="step"
				href={hrefWith({ from: previous.from, to: previous.to, category: null })}
				aria-label="Previous month"
				data-sveltekit-reset="false"><Icon name="back" size={20} /></a
			>
			<h2>{describeRange(report.range)}</h2>
			{#if data.isCurrentMonth}
				<span class="step" aria-hidden="true"></span>
			{:else}
				<a
					class="step"
					href={hrefWith({ from: next.from, to: next.to, category: null })}
					aria-label="Next month"
					data-sveltekit-reset="false"><Icon name="chevron" size={20} /></a
				>
			{/if}
		{:else}
			<h2>{describeRange(report.range)}</h2>
			<a class="button-quiet" href={base}>This month</a>
		{/if}
	</div>

	<details class="custom" open={!whole}>
		<summary>Custom dates</summary>
		<form method="GET" action={base} class="range-form">
			<label class="field">
				<span class="field-label">From</span>
				<input class="field-input" type="date" name="from" value={report.range.from} required />
			</label>
			<label class="field">
				<span class="field-label">To</span>
				<input class="field-input" type="date" name="to" value={report.range.to} required />
			</label>
			<button class="button-secondary">Show</button>
		</form>
	</details>

	<GlassCard>
		<p class="total">{formatMoney(report.totalCents)}</p>
		<p class="total-label">
			spent across {count(report.count)}. Repayments aren’t counted.
		</p>
	</GlassCard>

	{#if report.count === 0}
		<p class="quiet spaced">No expenses in {describeRange(report.range)}.</p>
	{:else}
		<section aria-labelledby="where-heading">
			<h2 id="where-heading" class="section-label">Where it went</h2>
			<CategoryBars
				categories={report.categories}
				selected={data.category}
				hrefFor={categoryHref}
			/>
		</section>

		<section aria-labelledby="trend-heading">
			<h2 id="trend-heading" class="section-label">
				{data.category ? `${categoryLabel(data.category)} over time` : 'Over time'}
			</h2>
			<TrendChart
				series={data.trend}
				bucket={report.bucket}
				colour={data.category ? categoryColour(data.category) : 'var(--chart-1)'}
				title={data.category ? categoryLabel(data.category) : 'Spending'}
			/>
		</section>

		{#if data.category && data.drill}
			<section aria-labelledby="drill-heading">
				<div class="drill-head">
					<h2 id="drill-heading" class="section-label">
						{categoryLabel(data.category)} · {count(data.drill.length)}
					</h2>
					<a class="button-quiet" href={categoryHref(null)} data-sveltekit-reset="false"
						>All categories</a
					>
				</div>
				{@render drillList(data.drill)}
			</section>
		{/if}
	{/if}
{:else}
	{@const { comparison } = data}
	{@const aLabel = describeRange(comparison.a.range)}
	{@const bLabel = describeRange(comparison.b.range)}
	<form method="GET" action={base} class="compare-form">
		<input type="hidden" name="mode" value="compare" />
		<fieldset class="field">
			<legend class="field-label">Compare</legend>
			<div class="range-row">
				<input
					class="field-input"
					type="date"
					name="aFrom"
					value={comparison.a.range.from}
					aria-label="First range from"
					required
				/>
				<input
					class="field-input"
					type="date"
					name="aTo"
					value={comparison.a.range.to}
					aria-label="First range to"
					required
				/>
			</div>
		</fieldset>
		<fieldset class="field">
			<legend class="field-label">With</legend>
			<div class="range-row">
				<input
					class="field-input"
					type="date"
					name="bFrom"
					value={comparison.b.range.from}
					aria-label="Second range from"
					required
				/>
				<input
					class="field-input"
					type="date"
					name="bTo"
					value={comparison.b.range.to}
					aria-label="Second range to"
					required
				/>
			</div>
		</fieldset>
		<div class="compare-actions">
			<a class="button-quiet" href="{base}?mode=compare">This month and last</a>
			<button class="button-secondary">Compare</button>
		</div>
	</form>

	<GlassCard>
		<div class="versus">
			<div>
				<p class="versus-label">{aLabel}</p>
				<p class="versus-total">{formatMoney(comparison.a.totalCents)}</p>
			</div>
			<div>
				<p class="versus-label">{bLabel}</p>
				<p class="versus-total">{formatMoney(comparison.b.totalCents)}</p>
			</div>
		</div>
		<p class="versus-change">
			{comparison.a.totalCents === 0 && comparison.b.totalCents === 0
				? 'No spending in either range.'
				: `${describeChange(comparison.changeCents, comparison.changeRatio)} in ${bLabel}`}
		</p>
	</GlassCard>

	{#if comparison.categories.length > 0}
		<section aria-labelledby="compare-heading">
			<h2 id="compare-heading" class="section-label">By category</h2>
			<CompareBars
				categories={comparison.categories}
				{aLabel}
				{bLabel}
				selected={data.category}
				hrefFor={categoryHref}
			/>
		</section>
	{/if}

	{#if data.category && data.drill}
		<section aria-labelledby="drill-heading">
			<div class="drill-head">
				<h2 id="drill-heading" class="section-label">{categoryLabel(data.category)}</h2>
				<a class="button-quiet" href={categoryHref(null)} data-sveltekit-reset="false"
					>All categories</a
				>
			</div>
			<h3 class="drill-range">{aLabel}</h3>
			{@render drillList(data.drill.a)}
			<h3 class="drill-range">{bLabel}</h3>
			{@render drillList(data.drill.b)}
		</section>
	{/if}
{/if}

<style>
	.modes {
		display: inline-flex;
		gap: 4px;
		margin-bottom: var(--space-l);
		padding: 4px;
		border: 1px solid var(--colour-hairline-strong);
		border-radius: var(--radius-pill);
	}

	.modes a {
		display: inline-flex;
		align-items: center;
		min-height: 36px;
		padding: 0 16px;
		border-radius: var(--radius-pill);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
		text-decoration: none;
	}

	.modes a[aria-current] {
		background: var(--colour-accent-soft);
		color: var(--colour-text);
	}

	.period {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-s);
	}

	.period h2 {
		flex: 1;
		font-size: 1.25rem;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		text-align: center;
	}

	.step {
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		border-radius: 50%;
		color: var(--colour-text-muted);
	}

	a.step:active {
		background: var(--colour-accent-soft);
	}

	.custom {
		margin: var(--space-s) 0 var(--space-l);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
		text-align: center;
	}

	.custom summary {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		cursor: pointer;
		list-style: none;
	}

	.custom summary::-webkit-details-marker {
		display: none;
	}

	.range-form {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
		align-items: end;
		gap: var(--space-s);
		margin-top: var(--space-s);
		text-align: left;
	}

	.range-form .button-secondary {
		min-height: 50px;
		padding: 0 18px;
	}

	.total {
		font-size: var(--text-event-title);
		line-height: 1.05;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		font-variant-numeric: tabular-nums;
	}

	.total-label {
		margin-top: var(--space-xs);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	section {
		margin-top: var(--space-xl);
	}

	.section-label {
		margin-bottom: var(--space-s);
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	.quiet {
		color: var(--colour-text-muted);
	}

	.spaced {
		margin-top: var(--space-l);
	}

	.drill-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.drill-head .section-label {
		margin: 0;
	}

	.drill-range {
		margin: var(--space-m) 0 var(--space-xs);
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
	}

	.drill {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.drill a {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 56px;
		border-bottom: 1px solid var(--colour-hairline);
		color: inherit;
		text-decoration: none;
	}

	.drill-date {
		width: 48px;
		flex: none;
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.drill-text {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}

	.drill-meta {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.drill-amount {
		font-variant-numeric: tabular-nums;
	}

	.compare-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
		margin-bottom: var(--space-l);
	}

	.range-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-s);
	}

	.range-row .field-input,
	.range-form .field-input {
		min-width: 0;
	}

	.compare-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.compare-actions .button-secondary {
		min-height: 44px;
	}

	.versus {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-m);
	}

	.versus-label {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.versus-total {
		margin-top: 2px;
		font-size: 1.5rem;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		font-variant-numeric: tabular-nums;
	}

	.versus-change {
		margin-top: var(--space-m);
		padding-top: var(--space-s);
		border-top: 1px solid var(--colour-hairline);
		font-size: var(--text-small);
	}
</style>
