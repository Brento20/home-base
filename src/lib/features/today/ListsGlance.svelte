<script lang="ts">
	import { arrive, changed, glide, leave } from '#lib/ui/motion.js';
	/**
	 * Lists on Today: the Shopping list as a widget with its quick-add field, so something
	 * remembered on the bus goes straight on it, and any other open lists as a short grouped
	 * panel underneath.
	 */
	import ShoppingCard from '#lib/features/lists/ShoppingCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { ListSummary } from '#lib/types.js';

	interface Props {
		lists: ListSummary[];
	}

	let { lists }: Props = $props();

	const shopping = $derived(lists.find((list) => list.pinned));
	const others = $derived(lists.filter((list) => !list.pinned).slice(0, 3));
</script>

<section class="glance" aria-labelledby="lists-heading">
	<div class="heading-row section-heading-row">
		<h2 id="lists-heading" class="section-heading">Lists</h2>
		<a class="see-all section-heading-link" href="/lists">All lists</a>
	</div>

	{#if shopping}
		<ShoppingCard list={shopping} />
	{/if}

	{#if others.length}
		<ul class="grouped others">
			{#each others as list (list.id)}
				<li
					in:arrive
					out:leave
					animate:glide
					use:changed={`${list.name}|${list.remaining}|${list.total}`}
				>
					<a class="grouped-row" href="/lists/{list.id}">
						<span class="grouped-label">{list.name}</span>
						<span class="grouped-value"
							>{list.total === 0 ? 'Empty' : `${list.remaining} to get`}</span
						>
						<span class="grouped-chevron"><Icon name="chevron" size={16} /></span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.heading-row {
		margin-bottom: 2px;
	}

	.see-all {
		padding: 6px 0;
	}

	.others {
		margin-top: 10px;
	}

	.others .grouped-value {
		font-size: var(--text-small);
	}
</style>
