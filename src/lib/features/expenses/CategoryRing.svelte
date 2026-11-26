<script lang="ts">
	/**
	 * Spending by category as a ring, as in Apple's Wallet and Screen Time: one segment per
	 * category, biggest first from the top, a hairline gap between them, the total in the middle.
	 * Tap a segment (or a row in the bars below, which double as its labelled legend) to pick
	 * a category; the middle then shows its amount and share. Sweeps round when it comes into view.
	 */
	import { reveal } from '#lib/ui/reveal.js';
	import { formatMoney, formatMoneyShort } from './money.js';
	import type { CategoryTotal } from './report.js';

	interface Props {
		categories: CategoryTotal[];
		totalCents: number;
		selected: string | null;
		hrefFor: (key: string | null) => string;
	}

	let { categories, totalCents, selected, hrefFor }: Props = $props();

	// Measured in hundredths of the ring (pathLength 100). The gap is skipped for a lone category.
	const GAP = 0.8;
	const segments = $derived.by(() => {
		let start = 0;
		const gap = categories.length > 1 ? GAP : 0;
		return categories.map((category, index) => {
			const length = Math.max(0.6, category.share * 100 - gap);
			const segment = { ...category, start, length, index };
			start += category.share * 100;
			return segment;
		});
	});
	const picked = $derived(categories.find((category) => category.key === selected) ?? null);
	const percent = (share: number) =>
		share > 0 && share < 0.01 ? '<1%' : `${Math.round(share * 100)}%`;
</script>

<figure class="ring">
	<svg viewBox="0 0 200 200" role="img" aria-label="Share of spending by category" use:reveal>
		<g transform="rotate(-90 100 100)">
			<circle class="track" cx="100" cy="100" r="78" pathLength="100" />
			{#each segments as segment (segment.key)}
				<a
					href={hrefFor(selected === segment.key ? null : segment.key)}
					data-sveltekit-reset="false"
					aria-label="{segment.label}: {formatMoney(segment.cents)}, {percent(segment.share)}"
				>
					<circle
						class="segment"
						class:dim={selected !== null && selected !== segment.key}
						cx="100"
						cy="100"
						r="78"
						pathLength="100"
						stroke={segment.colour}
						stroke-dashoffset={-segment.start}
						style:--length={segment.length}
						style:--delay="{segment.index * 70}ms"
					/>
					<!-- A wider, invisible ring to tap. -->
					<circle
						class="hit"
						cx="100"
						cy="100"
						r="78"
						pathLength="100"
						stroke-dasharray="{segment.length} {100 - segment.length}"
						stroke-dashoffset={-segment.start}
					/>
				</a>
			{/each}
		</g>
	</svg>
	<figcaption class="middle" aria-live="polite">
		{#if picked}
			<span class="middle-label">{picked.label}</span>
			<span class="middle-total">{formatMoneyShort(picked.cents)}</span>
			<span class="middle-label">{percent(picked.share)} of spending</span>
		{:else}
			<span class="middle-label">Spent</span>
			<span class="middle-total">{formatMoneyShort(totalCents)}</span>
			<span class="middle-label"
				>{categories.length} {categories.length === 1 ? 'category' : 'categories'}</span
			>
		{/if}
	</figcaption>
</figure>

<style>
	.ring {
		position: relative;
		width: min(220px, 64vw);
		margin: 0 auto var(--space-l);
	}

	svg {
		display: block;
		width: 100%;
		overflow: visible;
	}

	circle {
		fill: none;
	}

	.track {
		stroke: var(--colour-fill);
		stroke-width: 22;
	}

	/* Each segment sweeps from nothing to its length, one after another. */
	.segment {
		stroke-width: 22;
		stroke-dasharray: 0 100;
		transition:
			stroke-dasharray 900ms var(--ease-out) var(--delay),
			opacity var(--duration-quick) var(--ease-out);
	}

	svg:global(.shown) .segment {
		stroke-dasharray: var(--length) calc(100 - var(--length));
	}

	.segment.dim {
		opacity: 0.3;
	}

	.hit {
		stroke: transparent;
		stroke-width: 44;
	}

	a:focus-visible .segment {
		stroke-width: 28;
	}

	.middle {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		text-align: center;
	}

	.middle-label {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.middle-total {
		margin: 2px 0;
		font-size: var(--text-page-title);
		font-weight: var(--weight-display-l);
		letter-spacing: var(--tracking-display-l);
		font-variant-numeric: tabular-nums;
		font-family: var(--font-display);
	}

	@media (prefers-reduced-motion: reduce) {
		.segment {
			transition: none;
		}
	}
</style>
