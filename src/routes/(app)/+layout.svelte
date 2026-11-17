<script lang="ts">
	import { onMount } from 'svelte';
	import TabBar from '#lib/ui/TabBar.svelte';
	import { startLiveRefresh } from '#lib/ui/live-refresh.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Picks up what other phones changed: on return to the app, and every 20 seconds.
	onMount(() => startLiveRefresh());
</script>

<main class="screen">
	{@render children()}
</main>

<TabBar />

<style>
	.screen {
		/* The part of the screen that moves during page transitions. */
		view-transition-name: page;
		max-width: 480px;
		margin: 0 auto;
		padding: calc(env(safe-area-inset-top) + 28px) var(--page-gutter)
			calc(env(safe-area-inset-bottom) + 120px);
	}
</style>
