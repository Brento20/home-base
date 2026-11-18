<script lang="ts">
	/**
	 * Ingredients with their amounts. In the cook view they can be ticked off as you get them
	 * out (just on this phone, for while you cook).
	 */
	import { describeIngredient, type Ingredient } from './recipe.js';

	interface Props {
		ingredients: Ingredient[];
		/** Lets you tick each one off while cooking. */
		tickable?: boolean;
	}

	let { ingredients, tickable = false }: Props = $props();
	let ticked = $state<Set<number>>(new Set());

	function toggle(index: number) {
		const next = new Set(ticked);
		if (next.has(index)) next.delete(index);
		else next.add(index);
		ticked = next;
	}
</script>

<ul class="ingredients">
	{#each ingredients as ingredient, index (index)}
		{@const line = describeIngredient(ingredient)}
		<li class:ticked={ticked.has(index)}>
			{#if tickable}
				<button
					type="button"
					class="row"
					aria-pressed={ticked.has(index)}
					onclick={() => toggle(index)}
				>
					<span class="ring" aria-hidden="true"></span>
					<span class="text">
						<span class="name">{line.name}</span>
						{#if line.note}<span class="note">{line.note}</span>{/if}
					</span>
					<span class="amount">{line.amount}</span>
				</button>
			{:else}
				<span class="row">
					<span class="text">
						<span class="name">{line.name}</span>
						{#if line.note}<span class="note">{line.note}</span>{/if}
					</span>
					<span class="amount">{line.amount}</span>
				</span>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.ingredients {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 52px;
		padding: 8px 0;
		border: 0;
		border-bottom: 1px solid var(--colour-hairline);
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
	}

	li:last-child .row {
		border-bottom: 0;
	}

	.text {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.note {
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.amount {
		flex: none;
		max-width: 40%;
		text-align: right;
		color: var(--colour-accent);
		font-variant-numeric: tabular-nums;
		font-weight: var(--weight-medium);
	}

	.ring {
		flex: none;
		width: 22px;
		height: 22px;
		border: 2px solid var(--colour-hairline-strong);
		border-radius: 50%;
		transition:
			background-color var(--duration-quick) var(--ease-out),
			border-color var(--duration-quick) var(--ease-out),
			transform var(--duration-release) var(--spring-gentle);
	}

	.row:global([data-pressed]) .ring {
		transform: scale(0.86);
		transition-duration: var(--duration-press);
	}

	.ticked .ring {
		border-color: var(--colour-accent);
		background: var(--colour-accent);
	}

	.ticked .text,
	.ticked .amount {
		opacity: 0.45;
	}

	.ticked .name {
		text-decoration: line-through;
	}
</style>
