<script lang="ts">
	import { describePlanTime, planDay } from '#lib/features/plans/describe.js';
	import LinkedText from '#lib/features/plans/LinkedText.svelte';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { describeDaysAway, formatLongDate } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const plan = $derived(data.plan);
	const day = $derived(planDay(plan));
	const daysAway = $derived(describeDaysAway(day, data.today));
	const mapsHref = $derived(
		plan.location ? `https://maps.apple.com/?q=${encodeURIComponent(plan.location)}` : null
	);
</script>

<svelte:head>
	<title>{plan.title} · home base</title>
</svelte:head>

<nav class="top-bar" aria-label="Plan">
	<a class="button-quiet back" href="/plans"><Icon name="back" size={18} /> Plans</a>
	<a class="edit-button" href="/plans/{plan.id}/edit">
		<GlassSurface radius={22} squish />
		<span>Edit</span>
	</a>
</nav>

<article class="summary">
	<header class="hero">
		<GlassSurface radius={28} />
		<div class="hero-body">
			{#if daysAway}<p class="days-away">{daysAway}</p>{/if}
			<h1>{plan.title}</h1>
			<p class="when">
				<span>{formatLongDate(day, data.today)}</span>
				<span class="time">{describePlanTime(plan)}</span>
			</p>
		</div>
	</header>

	{#if plan.location}
		<section class="detail" aria-labelledby="where-heading">
			<h2 id="where-heading" class="detail-label">Where</h2>
			<p class="detail-text">{plan.location}</p>
			{#if mapsHref}
				<a class="button-quiet maps" href={mapsHref} target="_blank" rel="noopener noreferrer"
					>Open in Maps</a
				>
			{/if}
		</section>
	{/if}

	{#if plan.notes}
		<section class="detail" aria-labelledby="notes-heading">
			<h2 id="notes-heading" class="detail-label">Notes</h2>
			<p class="detail-text notes"><LinkedText text={plan.notes} /></p>
		</section>
	{/if}

	{#if plan.postId}
		<a class="from-post" href="/feed/{plan.postId}">
			<Icon name="compose" size={20} />
			<span class="from-post-text">
				<span class="from-post-title">From the home feed</span>
				<span class="from-post-sub">See the conversation</span>
			</span>
			<Icon name="chevron" size={16} />
		</a>
	{/if}
</article>

<style>
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: -10px -4px var(--space-l) -4px;
	}

	.edit-button {
		position: relative;
		display: grid;
		place-items: center;
		min-width: 76px;
		height: var(--tap-target);
		padding: 0 20px;
		border-radius: 22px;
		text-decoration: none;
		color: var(--colour-text);
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
		-webkit-touch-callout: none;
	}

	.edit-button span {
		position: relative;
		z-index: 1;
	}

	.edit-button::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline-strong),
			var(--glass-highlight);
		pointer-events: none;
	}

	.from-post {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 60px;
		padding: 10px 14px;
		border-radius: 18px;
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
		color: inherit;
		text-decoration: none;
	}

	.from-post:active {
		background: rgb(255 255 255 / 0.04);
	}

	.from-post > :global(svg:first-child) {
		color: var(--colour-accent);
	}

	.from-post > :global(svg:last-child) {
		color: var(--colour-text-faint);
	}

	.from-post-text {
		display: flex;
		flex: 1;
		flex-direction: column;
		line-height: 1.3;
	}

	.from-post-title {
		font-weight: var(--weight-medium);
	}

	.from-post-sub {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.summary {
		display: flex;
		flex-direction: column;
		gap: var(--space-l);
	}

	.hero {
		position: relative;
		border-radius: var(--radius-card);
	}

	.hero-body {
		position: relative;
		z-index: 1;
		padding: 24px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
	}

	.days-away {
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-accent);
	}

	h1 {
		margin-top: 8px;
		font-size: var(--text-event-title);
		line-height: 1.08;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		overflow-wrap: anywhere;
	}

	.when {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-top: 14px;
		font-size: var(--text-body);
	}

	.when .time {
		color: var(--colour-text-muted);
	}

	.detail {
		padding: 0 4px;
	}

	.detail-label {
		margin-bottom: 6px;
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	.detail-text {
		font-size: var(--text-body);
		overflow-wrap: anywhere;
	}

	.notes {
		white-space: pre-line;
	}

	.maps {
		margin-left: -4px;
		color: var(--colour-accent);
	}
</style>
