<script lang="ts">
	/** One list on the Lists page: its name, a progress bar and how many items are left. */
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { formatDayLabel, zonedParts } from '#lib/time.js';
	import type { ListSummary } from '#lib/types.js';

	interface Props {
		list: ListSummary;
		today: string;
	}

	let { list, today }: Props = $props();

	const status = $derived.by(() => {
		if (list.completedAt) {
			const day = formatDayLabel(zonedParts(new Date(list.completedAt)).date, today);
			const when = ['Today', 'Yesterday'].includes(day) ? day.toLowerCase() : `on ${day}`;
			return `Finished ${when} · ${list.total} ${list.total === 1 ? 'item' : 'items'}`;
		}
		if (list.total === 0) return 'Empty';
		return `${list.remaining} of ${list.total} to get`;
	});
	const progress = $derived(list.total ? (list.total - list.remaining) / list.total : 0);
</script>

<li>
	<a class="list-card" class:past={list.completedAt} href="/lists/{list.id}">
		<GlassSurface radius={22} squish />
		<span class="body">
			<span class="name">{list.name}</span>
			<span class="status">{status}</span>
			{#if !list.completedAt && list.total > 0}
				<span class="progress" aria-hidden="true"><span style:--progress={progress}></span></span>
			{/if}
			<span class="chevron"><Icon name="chevron" size={18} /></span>
		</span>
	</a>
</li>

<style>
	li {
		list-style: none;
	}

	.list-card {
		position: relative;
		display: block;
		border-radius: 22px;
		text-decoration: none;
		color: inherit;
		-webkit-touch-callout: none;
	}

	.body {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: var(--space-m);
		padding: 16px 14px 16px 18px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
	}

	.list-card:global([data-pressed]) .body {
		background-color: rgb(255 255 255 / 0.04);
	}

	.name {
		grid-column: 1;
		font-size: var(--text-body);
		font-weight: var(--weight-medium);
		overflow-wrap: anywhere;
	}

	.status {
		grid-column: 1;
		margin-top: 2px;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.progress {
		grid-column: 1;
		height: 3px;
		margin-top: 10px;
		border-radius: 2px;
		background: rgb(255 255 255 / 0.1);
		overflow: hidden;
	}

	.progress span {
		display: block;
		height: 100%;
		width: calc(var(--progress) * 100%);
		border-radius: inherit;
		background: var(--colour-accent);
		transition: width var(--duration-settle) var(--ease-out);
	}

	.chevron {
		grid-column: 2;
		grid-row: 1 / span 3;
		align-self: center;
		color: var(--colour-text-faint);
	}

	.past {
		opacity: 0.7;
	}
</style>
