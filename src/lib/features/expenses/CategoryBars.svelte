<script lang="ts">
	/**
	 * Spending by category as labelled horizontal bars, biggest first. Each row is a link: tap one
	 * to see the expenses behind it, tap it again to go back to every category.
	 */
	import { formatMoney } from './money.js';
	import type { CategoryTotal } from './report.js';

	interface Props {
		categories: CategoryTotal[];
		selected: string | null;
		/** Where tapping a category goes (null clears the selection). */
		hrefFor: (key: string | null) => string;
	}

	let { categories, selected, hrefFor }: Props = $props();

	const max = $derived(Math.max(1, ...categories.map((c) => c.cents)));
	const percent = (share: number) =>
		share > 0 && share < 0.01 ? '<1%' : `${Math.round(share * 100)}%`;
</script>

<ul class="bars">
	{#each categories as category (category.key)}
		{@const isSelected = selected === category.key}
		<li class:dim={selected !== null && !isSelected}>
			<a
				href={hrefFor(isSelected ? null : category.key)}
				data-sveltekit-reset="false"
				aria-current={isSelected ? 'true' : undefined}
				aria-label="{category.label}: {formatMoney(category.cents)}, {percent(
					category.share
				)} of spending, {category.count} {category.count === 1 ? 'expense' : 'expenses'}"
			>
				<span class="row">
					<span class="label">{category.label}</span>
					<span class="share">{percent(category.share)}</span>
					<span class="amount">{formatMoney(category.cents)}</span>
				</span>
				<span class="track">
					<span
						class="fill"
						style:width="{Math.max(1.5, (category.cents / max) * 100)}%"
						style:background={category.colour}
					></span>
				</span>
			</a>
		</li>
	{/each}
</ul>

<style>
	.bars {
		display: flex;
		flex-direction: column;
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
		padding: 10px 0;
		color: inherit;
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}

	.row {
		display: flex;
		align-items: baseline;
		gap: var(--space-s);
	}

	.label {
		flex: 1;
		font-size: var(--text-small);
	}

	[aria-current] .label {
		font-weight: var(--weight-strong);
	}

	.share {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.amount {
		min-width: 88px;
		font-size: var(--text-small);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	/* A thin bar with a rounded end, on a faint full-width track. */
	.track {
		display: block;
		height: 8px;
		border-radius: 4px;
		background: var(--colour-hairline);
	}

	.fill {
		display: block;
		height: 100%;
		border-radius: 4px;
	}
</style>
