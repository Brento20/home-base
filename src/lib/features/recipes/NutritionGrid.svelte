<script lang="ts">
	/** Nutrition per serve as a quiet grid: energy first (kJ, with Calories), then grams. */
	import type { Nutrition } from './recipe.js';

	interface Props {
		nutrition: Nutrition;
	}

	let { nutrition }: Props = $props();

	const tiles = $derived(
		(
			[
				['Protein', nutrition.proteinG],
				['Carbs', nutrition.carbsG],
				['Fat', nutrition.fatG],
				['Sugars', nutrition.sugarsG],
				['Fibre', nutrition.fibreG]
			] as [string, number | null][]
		).filter(([, grams]) => grams !== null) as [string, number][]
	);
	const grams = (value: number) =>
		`${value.toLocaleString('en-AU', { maximumFractionDigits: 1 })} g`;
</script>

<div class="nutrition">
	<div class="energy">
		<strong>{nutrition.energyKj.toLocaleString('en-AU')} kJ</strong>
		<span>{Math.round(nutrition.energyKj / 4.184).toLocaleString('en-AU')} Cal</span>
	</div>
	{#each tiles as [label, value] (label)}
		<div>
			<strong>{grams(value)}</strong>
			<span>{label}</span>
		</div>
	{/each}
</div>

<style>
	.nutrition {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-m) var(--space-s);
	}

	.nutrition div {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	strong {
		font-weight: var(--weight-medium);
		font-variant-numeric: tabular-nums;
	}

	span {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}
</style>
