<script lang="ts">
	import { onMount } from 'svelte';
	import AppGestures from '#lib/ui/AppGestures.svelte';
	import TabBar from '#lib/ui/TabBar.svelte';
	import { startLiveRefresh } from '#lib/ui/live-refresh.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Picks up what other phones changed: on return to the app, and every 20 seconds.
	onMount(() => startLiveRefresh());
</script>

<!--
	Clips rows that bleed past the screen (the Today carousel) so the page never scrolls or zooms
	sideways. It's a still wrapper: the page inside moves with swipes and the clip edge stays at
	the screen edge, and the tab bar sits outside it, so it's never redrawn as part of the page.
-->
<div class="page-clip">
	<main class="screen" data-page>
		{@render children()}
	</main>
</div>

<TabBar />
<!-- Swipe between tabs, swipe right to go back, pull down to refresh. -->
<AppGestures />

<style>
	.page-clip {
		overflow-x: clip;
	}

	.screen {
		max-width: 480px;
		margin: 0 auto;
		padding: calc(env(safe-area-inset-top) + 28px) var(--page-gutter)
			calc(env(safe-area-inset-bottom) + 120px);
	}
</style>
