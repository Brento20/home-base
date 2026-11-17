<script lang="ts">
	/**
	 * Compare mode: each category's spending in two date ranges, side by side, with how much it
	 * went up or down. Range A is grey and range B is blue, named in the legend above.
	 */
	import { formatMoney } from './money.js';
	import { describeChange, type CategoryChange } from './report.js';

	interface Props {
		categories: CategoryChange[];
		aLabel: string;
		bLabel: string;
		selected: string | null;
		hrefFor: (key: string | null) => string;
	}

	let { categories, aLabel, bLabel, selected, hrefFor }: Props = $props();

	const max = $derived(Math.max(1, ...categories.flatMap((c) => [c.aCents, c.bCents])));
	const width = (cents: number) => (cents ? Math.max(1.5, (cents / max) * 100) : 0);
</script>

<div class="legend" aria-hidden="true">
	<span><span class="key a"></span>{aLabel}</span>
	<span><span class="key b"></span>{bLabel}</span>
</div>

<ul class="rows">
	{#each categories as category (category.key)}
		{@const isSelected = selected === category.key}
		<li class:dim={selected !== null && !isSelected}>
			<a
				href={hrefFor(isSelected ? null : category.key)}
				data-sveltekit-reset="false"
				aria-current={isSelected ? 'true' : undefined}
				aria-label="{category.label}: {formatMoney(category.aCents)} in {aLabel}, {formatMoney(
					category.bCents
				)} in {bLabel}. {describeChange(category.changeCents, category.changeRatio)}"
			>
				<span class="head">
					<span class="swatch" style:background={category.colour}></span>
					<span class="label">{category.label}</span>
					<span class="change" class:up={category.changeCents > 0}>
						{category.aCents === 0
							? 'New'
							: describeChange(category.changeCents, category.changeRatio)}
					</span>
				</span>
				<span class="pair">
					<span class="track"
						><span class="fill a" style:width="{width(category.aCents)}%"></span></span
					>
					<span class="amount">{formatMoney(category.aCents)}</span>
					<span class="track"
						><span class="fill b" style:width="{width(category.bCents)}%"></span></span
					>
					<span class="amount">{formatMoney(category.bCents)}</span>
				</span>
			</a>
		</li>
	{/each}
</ul>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-m);
		margin-bottom: var(--space-s);
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.legend > span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.key {
		width: 14px;
		height: 8px;
		border-radius: 4px;
	}

	.key.a,
	.fill.a {
		background: var(--chart-other);
	}

	.key.b,
	.fill.b {
		background: var(--chart-1);
	}

	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		transition: opacity var(--duration-quick) var(--ease-out);
	}

	li.dim {
		opacity: 0.4;
	}

	a {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 0;
		border-bottom: 1px solid var(--colour-hairline);
		color: inherit;
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}

	.head {
		display: flex;
		align-items: center;
		gap: var(--space-s);
	}

	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.label {
		flex: 1;
		font-size: var(--text-small);
	}

	[aria-current] .label {
		font-weight: var(--weight-strong);
	}

	.change {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.change.up {
		color: var(--colour-text);
	}

	/* Two bars stacked with a 2px gap, each with its amount at the end. */
	.pair {
		display: grid;
		grid-template-columns: 1fr 88px;
		align-items: center;
		gap: 2px var(--space-s);
	}

	.track {
		display: block;
		height: 8px;
	}

	.fill {
		display: block;
		height: 100%;
		border-radius: 4px;
	}

	.amount {
		font-size: var(--text-caption);
		font-variant-numeric: tabular-nums;
		color: var(--colour-text-muted);
		text-align: right;
	}
</style>
