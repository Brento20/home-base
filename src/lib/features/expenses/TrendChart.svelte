<script lang="ts">
	/**
	 * Spending over time as thin columns, one per day, week or month, with a dashed line at the
	 * average (as in Apple's Health). Hover or tap a column to read its amount above the chart;
	 * the columns rise from the baseline when the chart comes into view. A hidden table gives
	 * screen readers the same numbers.
	 */
	import { reveal } from '#lib/ui/reveal.js';
	import { formatMoney, formatMoneyShort } from './money.js';
	import type { SeriesPoint } from './report.js';

	interface Props {
		series: SeriesPoint[];
		bucket: 'day' | 'week' | 'month';
		colour: string;
		/** What the chart shows, e.g. "Spending" or "Groceries". */
		title: string;
		/** Columns after this date haven't happened yet, so they're left out of the average. */
		today?: string;
	}

	let { series, bucket, colour, title, today }: Props = $props();

	const W = 340;
	const H = 150;
	const PAD_TOP = 8;
	const PAD_BOTTOM = 22;
	const PAD_LEFT = 44;
	const plotH = H - PAD_TOP - PAD_BOTTOM;
	const plotW = W - PAD_LEFT;

	let active = $state<number | null>(null);

	/** A round number just above the largest column, so gridlines land on tidy amounts. */
	const top = $derived.by(() => {
		const max = Math.max(...series.map((point) => point.cents), 0);
		if (max === 0) return 10000;
		const magnitude = 10 ** Math.floor(Math.log10(max));
		const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= max) ?? 10;
		return step * magnitude;
	});

	// The average per column, over the columns that have happened.
	const average = $derived.by(() => {
		const past = today ? series.filter((point) => point.start <= today) : series;
		return past.length ? past.reduce((sum, point) => sum + point.cents, 0) / past.length : 0;
	});

	const slot = $derived(plotW / Math.max(series.length, 1));
	// Thin columns with a gap between them; never wider than 18 units.
	const barW = $derived(Math.max(2, Math.min(18, slot - 2)));
	const y = (cents: number) => PAD_TOP + plotH - (cents / top) * plotH;

	/** Column path with rounded top corners, flat on the baseline. */
	function column(x: number, cents: number) {
		const height = (cents / top) * plotH;
		if (height <= 0) return '';
		const r = Math.min(4, barW / 2, height);
		const base = PAD_TOP + plotH;
		const yTop = base - height;
		return `M${x} ${base}V${yTop + r}Q${x} ${yTop} ${x + r} ${yTop}H${x + barW - r}Q${x + barW} ${yTop} ${x + barW} ${yTop + r}V${base}Z`;
	}

	const labelIndexes = $derived(
		series.length <= 1
			? [0]
			: [...new Set([0, Math.floor((series.length - 1) / 2), series.length - 1])]
	);

	const unit = $derived(bucket === 'day' ? 'day' : bucket === 'week' ? 'week of' : 'month');
	const readout = $derived(
		active === null
			? `Tap a ${bucket === 'week' ? 'week' : bucket} to see its total`
			: `${bucket === 'week' ? 'Week of ' : ''}${series[active].label}: ${formatMoney(series[active].cents)}`
	);
</script>

<figure class="trend">
	<p class="readout" aria-live="polite">{readout}</p>
	<svg viewBox="0 0 {W} {H}" role="img" aria-label="{title} by {unit}" use:reveal>
		<g class="grid">
			{#each [top / 2, top] as tick (tick)}
				<line x1={PAD_LEFT} x2={W} y1={y(tick)} y2={y(tick)} />
				<text x={PAD_LEFT - 6} y={y(tick) + 3.5} text-anchor="end">{formatMoneyShort(tick)}</text>
			{/each}
			<line class="baseline" x1={PAD_LEFT} x2={W} y1={PAD_TOP + plotH} y2={PAD_TOP + plotH} />
		</g>

		{#each series as point, index (point.start)}
			{@const x = PAD_LEFT + index * slot + (slot - barW) / 2}
			<path
				class="column"
				d={column(x, point.cents)}
				fill={colour}
				opacity={active === null || active === index ? 1 : 0.45}
				style:--i={index}
			/>
		{/each}

		{#if average > 0}
			<g class="average">
				<line x1={PAD_LEFT} x2={W} y1={y(average)} y2={y(average)} />
				<text x={W} y={y(average) - 4} text-anchor="end">avg {formatMoneyShort(average)}</text>
			</g>
		{/if}

		{#each labelIndexes as index (index)}
			<text
				class="x-label"
				x={PAD_LEFT + index * slot + slot / 2}
				y={H - 6}
				text-anchor={index === 0 ? 'start' : index === series.length - 1 ? 'end' : 'middle'}
				>{series[index].label}</text
			>
		{/each}

		<!-- Hit areas: the whole column height, wider than the mark, so small bars are easy to tap. -->
		{#each series as point, index (point.start)}
			<rect
				class="hit"
				x={PAD_LEFT + index * slot}
				y={PAD_TOP}
				width={slot}
				height={plotH}
				role="presentation"
				onpointerenter={() => (active = index)}
				onpointerdown={() => (active = index)}
				onpointerleave={(event) => {
					if (event.pointerType === 'mouse') active = null;
				}}
			/>
		{/each}
	</svg>

	<table class="visually-hidden">
		<caption>{title} by {unit}</caption>
		<thead><tr><th scope="col">Period</th><th scope="col">Spent</th></tr></thead>
		<tbody>
			{#each series as point (point.start)}
				<tr><td>{point.label}</td><td>{formatMoney(point.cents)}</td></tr>
			{/each}
		</tbody>
	</table>
</figure>

<style>
	.trend {
		margin: 0;
	}

	.readout {
		min-height: 1.4em;
		margin-bottom: var(--space-s);
		font-size: var(--text-small);
		font-variant-numeric: tabular-nums;
		color: var(--colour-text-muted);
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
		touch-action: pan-y;
	}

	.grid line {
		stroke: var(--colour-hairline);
		stroke-width: 1;
	}

	.grid .baseline {
		stroke: var(--colour-hairline-strong);
	}

	text {
		font-size: 10px;
		fill: var(--colour-text-faint);
		font-variant-numeric: tabular-nums;
	}

	/* The columns rise from the baseline, left to right, when the chart comes into view. */
	.column {
		transform: scaleY(0);
		transform-box: fill-box;
		transform-origin: bottom;
		transition:
			transform 700ms var(--spring-soft) calc(var(--i) * 14ms),
			opacity var(--duration-quick) var(--ease-out);
	}

	svg:global(.shown) .column {
		transform: scaleY(1);
	}

	.average line {
		stroke: var(--colour-text-muted);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}

	.average text {
		fill: var(--colour-text-muted);
	}

	.average {
		opacity: 0;
		transition: opacity 400ms var(--ease-out) 600ms;
	}

	svg:global(.shown) .average {
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.column,
		.average {
			transition: none;
		}
	}

	.hit {
		fill: transparent;
		cursor: pointer;
	}
</style>
