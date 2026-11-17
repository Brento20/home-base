<script lang="ts">
	/** The open lists on Today, each with how many items are left. */
	import Icon from '#lib/ui/Icon.svelte';
	import type { ListSummary } from '#lib/types.js';

	interface Props {
		lists: ListSummary[];
	}

	let { lists }: Props = $props();
</script>

<section aria-labelledby="lists-heading">
	<div class="heading-row">
		<h2 id="lists-heading" class="section-label">Lists</h2>
		<a class="see-all" href="/lists">All lists</a>
	</div>
	{#if lists.length === 0}
		<p class="empty">No lists on the go. <a href="/lists">Start one</a></p>
	{:else}
		<ul>
			{#each lists as list (list.id)}
				<li>
					<a class="row" href="/lists/{list.id}">
						<span class="name">{list.name}</span>
						<span class="count">{list.total === 0 ? 'Empty' : `${list.remaining} to get`}</span>
						<Icon name="chevron" size={16} />
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.heading-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.section-label {
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	.see-all {
		padding: 10px 0;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
		text-decoration: none;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-m);
		min-height: 52px;
		color: inherit;
		text-decoration: none;
		border-bottom: 1px solid var(--colour-hairline);
	}

	li:last-child .row {
		border-bottom: 0;
	}

	.name {
		flex: 1;
		min-width: 0;
		font-size: var(--text-body);
		overflow-wrap: anywhere;
	}

	.count {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.row :global(svg) {
		color: var(--colour-text-faint);
	}

	.empty {
		padding: var(--space-s) 0;
		color: var(--colour-text-faint);
	}

	.empty a {
		color: var(--colour-text-muted);
	}
</style>
