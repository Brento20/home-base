<script lang="ts">
	/**
	 * Stand-in shapes for a section whose data is on its way, the same size as what will
	 * replace them so nothing below moves when it lands. A soft breathing fill, not a shimmer.
	 */
	interface Props {
		/** Height of each block, in pixels. */
		heights: number[];
		radius?: number;
		gap?: number;
		label?: string;
	}

	let { heights, radius = 24, gap = 14, label = 'Loading' }: Props = $props();
</script>

<div class="placeholder" role="status" aria-label={label} style:gap="{gap}px">
	{#each heights as height, index (index)}
		<span class="block" style:height="{height}px" style:border-radius="{radius}px"></span>
	{/each}
</div>

<style>
	.placeholder {
		display: flex;
		flex-direction: column;
	}

	.block {
		display: block;
		background: var(--colour-fill);
		animation: breathe 1.6s ease-in-out infinite;
	}

	@keyframes breathe {
		50% {
			opacity: 0.55;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.block {
			animation: none;
		}
	}
</style>
