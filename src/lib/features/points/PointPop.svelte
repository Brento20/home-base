<script lang="ts">
	/** A "+1" that rises and fades from where you ticked something off. */
	interface Props {
		/** Increase to play it again. */
		count: number;
	}

	let { count }: Props = $props();
</script>

{#key count}
	{#if count > 0}
		<span class="point-pop" aria-hidden="true">+1</span>
	{/if}
{/key}

<style>
	.point-pop {
		position: absolute;
		left: 50%;
		top: -6px;
		z-index: 5;
		padding: 2px 8px;
		border-radius: var(--radius-pill);
		background: var(--colour-accent);
		color: var(--colour-on-accent);
		font-size: var(--text-caption);
		font-weight: var(--weight-strong);
		pointer-events: none;
		animation: rise 1000ms var(--ease-out) forwards;
	}

	@keyframes rise {
		0% {
			opacity: 0;
			transform: translate(-50%, 6px) scale(0.8);
		}
		18% {
			opacity: 1;
			transform: translate(-50%, -8px) scale(1.06);
		}
		60% {
			opacity: 1;
			transform: translate(-50%, -20px) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -34px) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.point-pop {
			animation: fade 900ms linear forwards;
		}

		@keyframes fade {
			0%,
			60% {
				opacity: 1;
				transform: translate(-50%, -12px);
			}
			100% {
				opacity: 0;
				transform: translate(-50%, -12px);
			}
		}
	}
</style>
