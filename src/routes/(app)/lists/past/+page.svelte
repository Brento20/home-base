<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import ListCard from '#lib/features/lists/ListCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.pastLists);
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
	<ul class="cards">
		{#each data.lists as list (list.id)}
			<ListCard {list} today={data.today} />
		{/each}
	</ul>
{/if}

<style>
	.cards {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
		padding: 0;
	}

	.empty {
		color: var(--colour-text-muted);
	}
</style>
