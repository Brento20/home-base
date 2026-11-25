<script lang="ts">
	/**
	 * A plan or a dinner as a tappable glass card: a small coloured label (when it is), the
	 * title, an optional detail line, and a chevron. The Plans list (PlanRow) and the calendar's
	 * day list both use it, so the two always match.
	 */
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon, { type IconName } from '#lib/ui/Icon.svelte';

	interface Props {
		href: string;
		/** The label above the title: the time, or "Dinner · 6:30 pm". */
		when: string;
		/** An icon before the label (dinners). */
		icon?: IconName;
		/** The label's colour: the accent for plans, lilac for dinners. */
		tone?: 'plan' | 'dinner';
		title: string;
		detail?: string;
		/** Over (an earlier plan today, a cooked dinner): shown dimmed. */
		past?: boolean;
	}

	let { href, when, icon, tone = 'plan', title, detail, past = false }: Props = $props();
</script>

<a class="entry-card" class:past {href}>
	<GlassSurface radius={22} squish />
	<span class="body">
		<span class="when caption-label" class:dinner={tone === 'dinner'}>
			{#if icon}<Icon name={icon} size={14} />{/if}{when}
		</span>
		<span class="title">{title}</span>
		{#if detail}<span class="detail one-line">{detail}</span>{/if}
		<span class="chevron"><Icon name="chevron" size={18} /></span>
	</span>
</a>

<style>
	.entry-card {
		position: relative;
		display: block;
		border-radius: 22px;
		color: inherit;
		text-decoration: none;
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
			inset 0 0 0 var(--hairline) var(--colour-separator),
			var(--glass-highlight);
		transition: background-color var(--duration-quick) var(--ease-out);
	}

	/* A touch brighter under the finger, alongside the glass squish. */
	.entry-card:global([data-pressed]) .body {
		background-color: var(--colour-press);
	}

	.when {
		display: inline-flex;
		grid-column: 1;
		align-items: center;
		gap: 6px;
		color: var(--colour-accent);
	}

	.when.dinner {
		color: var(--colour-dinner);
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

	.past .when:not(.dinner) {
		color: var(--colour-text-muted);
	}
</style>
