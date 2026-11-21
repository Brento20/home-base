<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import Icon from '#lib/ui/Icon.svelte';
	import { formatDayLabel, zonedParts } from '#lib/time.js';
	import type { ListSummary } from '#lib/types.js';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.pastLists);

	function finished(list: ListSummary) {
		const day = formatDayLabel(zonedParts(new Date(list.completedAt!)).date, data.today);
		const when = ['Today', 'Yesterday'].includes(day) ? day.toLowerCase() : `on ${day}`;
		return `Finished ${when} · ${list.total} ${list.total === 1 ? 'item' : 'items'}`;
	}
</script>

<svelte:head>
	<title>Past lists · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/lists"><Icon name="back" size={18} /> Lists</a>
	{/snippet}
</PageHeader>

{#if data.lists.length === 0}
	<p class="empty">Finished lists will show up here.</p>
{:else}
	<ul class="grouped">
		{#each data.lists as list (list.id)}
			<li>
				<a class="grouped-row" href="/lists/{list.id}">
					<span class="grouped-label">
						{list.name}
						<span class="grouped-sub">{finished(list)}</span>
					</span>
					<span class="grouped-chevron"><Icon name="chevron" size={16} /></span>
				</a>
			</li>
		{/each}
	</ul>
	<p class="group-note">Untick or add something on a list to bring it back.</p>
{/if}

<style>
	.empty {
		color: var(--colour-text-muted);
	}
</style>
