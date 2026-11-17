<script lang="ts">
	/**
	 * One line in a group's history: an expense with your part of it, or a repayment.
	 * Tapping opens it to edit or delete.
	 */
	import type { ExpenseActivity, Profile } from '#lib/types.js';
	import { categoryColour, categoryLabel } from './categories.js';
	import { describeBetween, describeSettlement, myEffect, nameOf, onlyOther } from './describe.js';
	import { formatMoney } from './money.js';

	interface Props {
		item: ExpenseActivity;
		groupId: string;
		people: Profile[];
		me: string;
	}

	let { item, groupId, people, me }: Props = $props();

	const day = $derived(Number(item.date.slice(8)));

	const other = $derived(onlyOther(people, me));

	/**
	 * What this expense did to your balance, in the same words as the headline: "Chris owes you
	 * $10.00" between two people, "you lent $20.00" or "you borrowed $12.50" in bigger groups.
	 */
	const yourPart = $derived.by(() => {
		if (item.kind !== 'expense') return null;
		const effect = myEffect(item.expense, me);
		if (effect === 0) return null;
		const tone = effect > 0 ? 'lent' : 'borrowed';
		if (other) return { text: describeBetween(effect, other.displayName), tone };
		return {
			text: effect > 0 ? `you lent ${formatMoney(effect)}` : `you borrowed ${formatMoney(-effect)}`,
			tone
		};
	});
</script>

{#if item.kind === 'expense'}
	{@const { expense } = item}
	<li>
		<a class="row" href="/money/{groupId}/expenses/{expense.id}">
			<span class="day">{day}</span>
			<span class="swatch" style:--swatch={categoryColour(expense.category)} aria-hidden="true"
			></span>
			<span class="text">
				<span class="title">{expense.description}</span>
				<span class="meta">
					{nameOf(people, expense.paidBy, me)} paid {formatMoney(
						expense.amountCents
					)}{categoryLabel(expense.category) === expense.description
						? ''
						: ` · ${categoryLabel(expense.category)}`}
				</span>
			</span>
			{#if yourPart}
				<span class="part {yourPart.tone}">{yourPart.text}</span>
			{:else}
				<span class="part">{expense.paidBy === me ? 'just you' : 'not involved'}</span>
			{/if}
		</a>
	</li>
{:else}
	{@const { settlement } = item}
	<li>
		<a class="row" href="/money/{groupId}/settlements/{settlement.id}">
			<span class="day">{day}</span>
			<span class="swatch repayment" aria-hidden="true"></span>
			<span class="text">
				<span class="title">
					{describeSettlement(
						settlement.paidBy,
						settlement.paidTo,
						settlement.amountCents,
						people,
						me
					)}
				</span>
				<span class="meta">Repayment</span>
			</span>
		</a>
	</li>
{/if}

<style>
	li {
		list-style: none;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 60px;
		padding: 8px 0;
		border-bottom: 1px solid var(--colour-hairline);
		color: inherit;
		text-decoration: none;
	}

	.day {
		width: 22px;
		flex: none;
		font-size: var(--text-small);
		font-variant-numeric: tabular-nums;
		color: var(--colour-text-faint);
		text-align: right;
	}

	.swatch {
		width: 10px;
		height: 10px;
		flex: none;
		border-radius: 50%;
		background: var(--swatch);
	}

	.swatch.repayment {
		background: none;
		border: 1.5px solid var(--colour-text-faint);
	}

	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta {
		overflow: hidden;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.part {
		flex: none;
		max-width: 40%;
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
		text-align: right;
	}

	.part.lent {
		color: var(--colour-accent);
	}

	.part.borrowed {
		color: var(--colour-text-muted);
	}
</style>
