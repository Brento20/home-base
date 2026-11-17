<script lang="ts">
	/** One plan in the Plans list, as a tappable glass card that opens its summary. */
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { Plan } from '#lib/types.js';
	import { describePlanTime } from './describe.js';

	interface Props {
		plan: Plan;
		/** Earlier today and already over. */
		past?: boolean;
	}

	let { plan, past = false }: Props = $props();

	const detail = $derived([plan.location, plan.notes.split('\n')[0]].filter(Boolean).join(' · '));
</script>

<li>
	<a class="plan-card" class:past href="/plans/{plan.id}">
		<GlassSurface radius={22} refraction={28} squish lazy />
		<span class="body">
			<span class="time">{describePlanTime(plan)}</span>
			<span class="title">{plan.title}</span>
			{#if detail}<span class="detail">{detail}</span>{/if}
			<span class="chevron"><Icon name="chevron" size={18} /></span>
		</span>
	</a>
</li>

<style>
	li {
		list-style: none;
	}

	.plan-card {
		position: relative;
		display: block;
		border-radius: 22px;
		text-decoration: none;
		color: inherit;
		-webkit-touch-callout: none;
		transition: opacity var(--duration-quick) var(--ease-out);
	}

	.body {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: var(--space-m);
		min-height: var(--row-height);
		padding: 14px 14px 14px 18px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
		transition: background-color var(--duration-quick) var(--ease-out);
	}

	/* A touch brighter under the finger, alongside the glass squish. */
	.plan-card:active .body {
		background-color: rgb(255 255 255 / 0.04);
	}

	.time {
		grid-column: 1;
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-accent);
	}

	.title {
		grid-column: 1;
		margin-top: 3px;
		font-size: var(--text-body);
		font-weight: var(--weight-medium);
		overflow-wrap: anywhere;
	}

	.detail {
		grid-column: 1;
		margin-top: 2px;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chevron {
		grid-column: 2;
		grid-row: 1 / span 3;
		align-self: center;
		color: var(--colour-text-faint);
	}

	.past {
		opacity: 0.55;
	}

	.past .time {
		color: var(--colour-text-muted);
	}
</style>
