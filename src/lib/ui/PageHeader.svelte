<script lang="ts">
	/**
	 * A page's title row, with an optional back link above it and a button beside it. On a
	 * detail screen, Edit goes in `trailing`: the back-link row's right end, as on iOS, so it
	 * sits in the same place on every screen and never squeezes a long title.
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** Shown before the title, e.g. a back link. */
		lead?: Snippet;
		/** Shown at the right of the title, e.g. a new-item button. */
		action?: Snippet;
		/** Shown at the right of the back-link row, e.g. Edit. */
		trailing?: Snippet;
	}

	let { title, lead, action, trailing }: Props = $props();
</script>

<header class="page-header">
	{#if lead || trailing}
		<div class="lead">
			{@render lead?.()}
			{#if trailing}<span class="trailing">{@render trailing()}</span>{/if}
		</div>
	{/if}
	<div class="title-row">
		<h1 class="page-title">{title}</h1>
		{#if action}{@render action()}{/if}
	</div>
</header>

<style>
	.page-header {
		margin-bottom: var(--space-l);
	}

	.lead {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-m);
		margin: -10px -4px var(--space-s) -4px;
	}

	.trailing {
		margin-left: auto;
	}

	.title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-m);
		min-height: var(--tap-target);
	}
</style>
