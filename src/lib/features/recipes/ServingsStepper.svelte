<script lang="ts">
	/** − 2 serves + : how many the recipe is for. */
	import Icon from '#lib/ui/Icon.svelte';
	import { SERVINGS_MAX, SERVINGS_MIN } from './recipe.js';

	interface Props {
		value: number;
	}

	let { value = $bindable() }: Props = $props();
</script>

<div class="servings" role="group" aria-label="Servings">
	<button
		type="button"
		aria-label="Fewer servings"
		disabled={value <= SERVINGS_MIN}
		onclick={() => (value = Math.max(SERVINGS_MIN, value - 1))}
	>
		<Icon name="minus" size={18} />
	</button>
	<span class="count" aria-live="polite">
		<strong>{value}</strong>
		<span>{value === 1 ? 'serve' : 'serves'}</span>
	</span>
	<button
		type="button"
		aria-label="More servings"
		disabled={value >= SERVINGS_MAX}
		onclick={() => (value = Math.min(SERVINGS_MAX, value + 1))}
	>
		<Icon name="plus" size={18} />
	</button>
</div>

<style>
	.servings {
		display: flex;
		align-items: center;
		flex: none;
	}

	button {
		display: grid;
		place-items: center;
		width: 38px;
		height: 44px;
		border: 0;
		border-radius: var(--radius-pill);
		background: none;
		color: var(--colour-text);
		transition: transform var(--duration-release) var(--spring-gentle);
	}

	button:disabled {
		color: var(--colour-text-faint);
	}

	button:global([data-pressed]) {
		transform: scale(0.85);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}

	.count {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 38px;
		line-height: 1.05;
	}

	.count strong {
		font-size: 1.15rem;
		font-variant-numeric: tabular-nums;
	}

	.count span {
		font-size: 11px;
		color: var(--colour-text-muted);
	}
</style>
