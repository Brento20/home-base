<script lang="ts">
	/**
	 * Spending pace: the running total through one period, drawn over the period before (or the
	 * other range, in Compare), day by day, so you can see at a glance whether you're ahead or
	 * behind, as in the Screen Time and Health comparisons. Drag across it (or hover) to read any
	 * day; the line draws itself in when it comes into view. The current line is solid, the one
	 * it's measured against is dashed and quieter, and both are named in the legend, so colour is
	 * never the only clue. A hidden table gives screen readers the numbers.
	 */
	import { reveal } from '#lib/ui/reveal.js';
	import { formatMoney, formatMoneyShort } from './money.js';

	interface Props {
		/** Running totals, one per day: the line in front. May stop early (this month, at today). */
		now: number[];
		/** The line it's measured against. */
		before: number[];
		nowLabel: string;
		beforeLabel: string;
		colour?: string;
	}

	let { now, before, nowLabel, beforeLabel, colour = 'var(--chart-1)' }: Props = $props();

	// Unique per chart, so two on screen at once (mid page-change) don't share a gradient.
	const uid = $props.id();
	const fillId = `pace-fill-${uid}`;

	const W = 340;
	const H = 170;
	const PAD_TOP = 10;
	const PAD_BOTTOM = 22;
	const PAD_LEFT = 44;
	const PAD_RIGHT = 6;
	const plotW = W - PAD_LEFT - PAD_RIGHT;
	const plotH = H - PAD_TOP - PAD_BOTTOM;

	const days = $derived(Math.max(now.length, before.length, 2));

	/** A round number at or above the highest point, so gridlines land on tidy amounts. */
	const top = $derived.by(() => {
		const max = Math.max(...now, ...before, 0);
		if (max === 0) return 10000;
		const magnitude = 10 ** Math.floor(Math.log10(max));
		const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= max) ?? 10;
		return step * magnitude;
	});

	const x = (day: number) => PAD_LEFT + (day / (days - 1)) * plotW;
	const y = (cents: number) => PAD_TOP + plotH - (cents / top) * plotH;

	// Steps, not slopes: a running total only changes on the day something's bought.
	function stepPath(values: number[]) {
		if (values.length === 0) return '';
		let d = `M${x(0)} ${y(values[0])}`;
		for (let i = 1; i < values.length; i++) d += `H${x(i)}V${y(values[i])}`;
		return d;
	}

	const nowPath = $derived(stepPath(now));
	const beforePath = $derived(stepPath(before));
	const nowArea = $derived(now.length ? `${nowPath}V${PAD_TOP + plotH}H${x(0)}Z` : '');

	// The day you're reading: dragged to, or the latest one with a value.
	let active = $state<number | null>(null);
	const shownDay = $derived(active ?? Math.max(now.length - 1, 0));
	const nowAt = $derived(now[Math.min(shownDay, now.length - 1)] ?? 0);
	const beforeAt = $derived(before[Math.min(shownDay, before.length - 1)] ?? 0);
	const nowHasDay = $derived(shownDay < now.length);

	const summary = $derived.by(() => {
		if (!now.length) return 'Nothing spent yet.';
		const gap = nowAt - beforeAt;
		const when = active === null ? 'so far' : `by day ${shownDay + 1}`;
		if (!before.length || beforeAt === 0) return `${formatMoney(nowAt)} ${when}.`;
		if (Math.abs(gap) < 100) return `${formatMoney(nowAt)} ${when}, level with ${beforeLabel}.`;
		return `${formatMoney(nowAt)} ${when}, ${formatMoney(Math.abs(gap))} ${gap > 0 ? 'more' : 'less'} than ${beforeLabel}.`;
	});

	function read(event: PointerEvent) {
		const box = (event.currentTarget as SVGElement).getBoundingClientRect();
		const px = ((event.clientX - box.left) / box.width) * W;
		active = Math.max(0, Math.min(days - 1, Math.round(((px - PAD_LEFT) / plotW) * (days - 1))));
	}

	const labelDays = $derived([0, Math.floor((days - 1) / 2), days - 1]);
</script>

<figure class="pace">
	<p class="readout" aria-live="polite">{summary}</p>
	<svg
		viewBox="0 0 {W} {H}"
		role="img"
		aria-label="Running total: {nowLabel} against {beforeLabel}"
		use:reveal
		onpointermove={read}
		onpointerdown={read}
		onpointerleave={(event) => {
			if (event.pointerType === 'mouse') active = null;
		}}
	>
		<defs>
			<linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
				<stop offset="0" stop-color={colour} stop-opacity="0.22" />
				<stop offset="1" stop-color={colour} stop-opacity="0" />
			</linearGradient>
		</defs>

		<g class="grid">
			{#each [top / 2, top] as tick (tick)}
				<line x1={PAD_LEFT} x2={W - PAD_RIGHT} y1={y(tick)} y2={y(tick)} />
				<text x={PAD_LEFT - 6} y={y(tick) + 3.5} text-anchor="end">{formatMoneyShort(tick)}</text>
			{/each}
			<line
				class="baseline"
				x1={PAD_LEFT}
				x2={W - PAD_RIGHT}
				y1={PAD_TOP + plotH}
				y2={PAD_TOP + plotH}
			/>
		</g>

		{#if before.length}
			<path class="line before" d={beforePath} pathLength="1" />
		{/if}
		{#if now.length}
			<path class="area" d={nowArea} fill="url(#{fillId})" />
			<path class="line now" d={nowPath} pathLength="1" stroke={colour} />
		{/if}

		<!-- The day being read: a crosshair, and a dot on each line. -->
		<line
			class="cross"
			x1={x(shownDay)}
			x2={x(shownDay)}
			y1={PAD_TOP}
			y2={PAD_TOP + plotH}
			opacity={active === null ? 0 : 1}
		/>
		{#if before.length}
			<circle class="dot before-dot" cx={x(shownDay)} cy={y(beforeAt)} r="4" />
		{/if}
		{#if now.length && nowHasDay}
			<circle class="dot" cx={x(shownDay)} cy={y(nowAt)} r="4.5" fill={colour} />
		{/if}

		{#each labelDays as day, index (index)}
			<text
				class="x-label"
				x={x(day)}
				y={H - 6}
				text-anchor={index === 0 ? 'start' : index === 2 ? 'end' : 'middle'}>Day {day + 1}</text
			>
		{/each}
	</svg>

	<table class="visually-hidden">
		<caption>Running total by day</caption>
		<thead><tr><th>Day</th><th>{nowLabel}</th><th>{beforeLabel}</th></tr></thead>
		<tbody>
			{#each { length: days } as _, day (day)}
				<tr>
					<td>{day + 1}</td>
					<td>{day < now.length ? formatMoney(now[day]) : '—'}</td>
					<td>{day < before.length ? formatMoney(before[day]) : '—'}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<figcaption class="legend">
		<span><span class="key solid" style:background={colour}></span>{nowLabel}</span>
		<span><span class="key dashed"></span>{beforeLabel}</span>
	</figcaption>
</figure>

<style>
	.pace {
		margin: 0;
	}

	.readout {
		min-height: 2.6em;
		margin: 0 0 6px 4px;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	svg {
		display: block;
		width: 100%;
		overflow: visible;
		touch-action: pan-y;
		cursor: crosshair;
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

	.line {
		fill: none;
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
		/* Drawn in when it comes into view. */
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		transition: stroke-dashoffset 1100ms var(--ease-out);
	}

	/* The line it's measured against: quieter, and dashed once it's drawn. */
	.before {
		stroke: var(--colour-text-faint);
	}

	svg:global(.shown) .line {
		stroke-dashoffset: 0;
	}

	svg:global(.shown) .before {
		stroke-dasharray: 0.012 0.008;
		transition: none;
	}

	.area {
		opacity: 0;
		transition: opacity 600ms var(--ease-out) 500ms;
	}

	svg:global(.shown) .area {
		opacity: 1;
	}

	.cross {
		stroke: var(--colour-hairline-strong);
		stroke-width: 1;
		transition: opacity var(--duration-quick) var(--ease-out);
	}

	.dot {
		stroke: var(--colour-ground);
		stroke-width: 2;
	}

	.before-dot {
		fill: var(--colour-text-muted);
	}

	.legend {
		display: flex;
		justify-content: center;
		gap: var(--space-l);
		margin-top: 10px;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.legend > span {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.key {
		width: 16px;
		height: 2px;
		border-radius: 1px;
	}

	.key.dashed {
		background: repeating-linear-gradient(
			90deg,
			var(--colour-text-faint) 0 4px,
			transparent 4px 7px
		);
	}

	@media (prefers-reduced-motion: reduce) {
		.line,
		.area {
			transition: none;
		}
	}
</style>
