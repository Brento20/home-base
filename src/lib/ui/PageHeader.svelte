<script lang="ts">
	/** A page's title row, with an optional back link above it and a button beside it. */
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** Shown before the title, e.g. a back link. */
		lead?: Snippet;
		/** Shown at the right, e.g. a new-item button. */
		action?: Snippet;
	}

	let { title, lead, action }: Props = $props();
</script>

<header class="page-header">
	{#if lead}<div class="lead">{@render lead()}</div>{/if}
	<div class="title-row">
		<h1>{title}</h1>
		{#if action}{@render action()}{/if}
	</div>
</header>

<style>
	.page-header {
		margin-bottom: var(--space-l);
	}

	.lead {
		margin: -10px 0 var(--space-s) -4px;
	}

	.title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-m);
		min-height: var(--tap-target);
	}

	h1 {
		font-size: var(--text-page-title);
		line-height: 1.12;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
	}
</style>
