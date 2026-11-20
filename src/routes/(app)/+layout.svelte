<script lang="ts">
	import { onMount } from 'svelte';
	import AppGestures from '#lib/ui/AppGestures.svelte';
	import TabBar from '#lib/ui/TabBar.svelte';
	import { drift } from '#lib/ui/backdrop-drift.js';
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

<!--
	The page melts into the backdrop under the status bar and as it nears the tab bar: these
	paint the backdrop itself over the page, faded in, so content dissolves rather than slides
	under hard edges. Static layers, so scrolling past them costs nothing.
-->
<div class="edge-fade top backdrop-paint" data-still="fade-top" aria-hidden="true" use:drift></div>
<div
	class="edge-fade bottom backdrop-paint"
	data-still="fade-bottom"
	aria-hidden="true"
	use:drift
></div>

<TabBar />
<!-- Swipe between tabs, swipe right to go back, pull down to refresh. -->
<AppGestures />

<style>
	.page-clip {
		overflow-x: clip;
	}

	.edge-fade {
		position: fixed;
		left: 0;
		right: 0;
		pointer-events: none;
	}

	/* Under the clock and notch: solid behind the status bar, gone a little below it. */
	.top {
		top: 0;
		z-index: 15;
		height: calc(env(safe-area-inset-top) + 22px);
		-webkit-mask-image: linear-gradient(
			to bottom,
			#000 calc(env(safe-area-inset-top) * 0.7),
			transparent
		);
		mask-image: linear-gradient(to bottom, #000 calc(env(safe-area-inset-top) * 0.7), transparent);
	}

	/*
	 * From a little above the tab bar down to the bottom edge, nearly solid by the time it's
	 * behind the bar. iOS Safari sometimes drops a fixed element's blur for a frame; with this
	 * under the bar, there's nothing sharp left to show through when it does.
	 */
	.bottom {
		bottom: 0;
		z-index: 25;
		height: calc(env(safe-area-inset-bottom) + 136px);
		background-position:
			0 0,
			left bottom,
			left bottom,
			left bottom;
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent,
			rgb(0 0 0 / 0.92) 42%,
			rgb(0 0 0 / 0.97)
		);
		mask-image: linear-gradient(to bottom, transparent, rgb(0 0 0 / 0.92) 42%, rgb(0 0 0 / 0.97));
	}

	.screen {
		max-width: 480px;
		margin: 0 auto;
		padding: calc(env(safe-area-inset-top) + 28px) var(--page-gutter)
			calc(env(safe-area-inset-bottom) + 120px);
	}
</style>
