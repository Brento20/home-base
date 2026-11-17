<script lang="ts">
	/** A plan card in Today's row. The next plan gets a live countdown and a larger title. */
	import { describePlanWhen } from '#lib/features/plans/describe.js';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import { describeCountdown } from '#lib/time.js';
	import type { Plan } from '#lib/types.js';

	interface Props {
		plan: Plan;
		today: string;
		/** The next plan: live countdown and the larger title. */
		next?: boolean;
		/** The card you've swiped to: warm tint, edge and text. The glow itself is drawn by the row. */
		highlighted?: boolean;
		/** Client clock for the countdown; null during server render. */
		now?: Date | null;
		label?: string;
	}

	let { plan, today, next = false, highlighted = false, now = null, label }: Props = $props();

	const when = $derived(describePlanWhen(plan, today));
	const detail = $derived(plan.notes.split('\n')[0] || plan.location);
	const countdown = $derived(
		next && now && !plan.allDay ? describeCountdown(new Date(plan.startsAt), now) : null
	);
</script>

<a class="hero-card" class:next class:highlighted href="/plans/{plan.id}" aria-label={label}>
	<GlassSurface radius={28} refraction={next ? 38 : 32} squish />
	<span class="body">
		<span class="when"
			>{when}{#if countdown}<span>{` · ${countdown}`}</span>{/if}</span
		>
		<span class="title">{plan.title}</span>
		{#if detail}<span class="detail">{detail}</span>{/if}
	</span>
</a>

<style>
	.hero-card {
		--highlight-speed: 450ms;
		position: relative;
		display: block;
		height: 100%;
		border-radius: var(--radius-card);
		text-decoration: none;
		color: inherit;
		-webkit-touch-callout: none;
	}

	.body {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 22px 24px 24px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
		transition: box-shadow var(--highlight-speed) var(--ease-out);
	}

	/* Warm wash over the glass, faded rather than swapped so it travels smoothly. */
	.body::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: inherit;
		background: linear-gradient(180deg, var(--colour-accent-soft), transparent 70%);
		opacity: 0;
		transition: opacity var(--highlight-speed) var(--ease-out);
		pointer-events: none;
	}

	.highlighted .body {
		box-shadow:
			inset 0 0 0 1px var(--colour-accent-edge),
			var(--glass-highlight);
	}

	.highlighted .body::before {
		opacity: 1;
	}

	.when {
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
		transition: color var(--highlight-speed) var(--ease-out);
	}

	.highlighted .when {
		color: var(--colour-accent);
	}

	.title {
		margin-top: 10px;
		font-size: 1.625rem;
		line-height: 1.08;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* The next plan reads largest, wherever the highlight is. */
	.next .title {
		font-size: var(--text-event-title);
	}

	.detail {
		margin-top: 6px;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
