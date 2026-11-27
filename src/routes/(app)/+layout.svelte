<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import AppGestures from '#lib/ui/AppGestures.svelte';
	import TabBar from '#lib/ui/TabBar.svelte';
	import { drift } from '#lib/ui/backdrop-drift.js';
	import { startLiveRefresh } from '#lib/ui/live-refresh.js';
	import { setHomeSettings } from '#lib/home.js';
	import { applyDisplay, displayPrefs } from '#lib/display.svelte.js';
	import SnowGlobe from '#lib/ui/SnowGlobe.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// Your display preferences on this phone: steady words, and the glow switch (the server has
	// already drawn the first paint with them; src/lib/display.svelte.ts).
	$effect(() => applyDisplay(displayPrefs(data.display)));

	// Dates and money on this phone follow the home's time zone and currency, set before any
	// page below renders (so hydration matches the server), and again if they're changed.
	untrack(() => setHomeSettings(data.home));
	$effect.pre(() => setHomeSettings(data.home));

	// Picks up what other phones changed: everything on return to the app, and Today every minute.
	// Navigations tell the refresher the page is fresh, so it doesn't reload it straight away.
	let markFresh: (() => void) | null = null;
	afterNavigate(() => markFresh?.());
	onMount(() =>
		startLiveRefresh(60_000, (done) => {
			markFresh = done;
			return () => (markFresh = null);
		})
	);
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

<!-- The Christmas snow, for anyone who's switched it on (Preferences). -->
<SnowGlobe prefs={displayPrefs(data.display)} />

<TabBar homeDot={data.requestsWaiting} />
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
	 *
	 * The layer itself covers the whole screen and the mask shows only the bottom band, so its
	 * glows line up with the backdrop's exactly: background positions count from an element's
	 * own top, so a band-sized layer painted the glows a screen-height out of step, which
	 * showed as a lighter or darker strip along the bottom.
	 */
	.bottom {
		--fade-height: calc(env(safe-area-inset-bottom) + 136px);
		top: 0;
		bottom: 0;
		z-index: 25;
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent calc(100% - var(--fade-height)),
			rgb(0 0 0 / 0.92) calc(100% - var(--fade-height) * 0.58),
			rgb(0 0 0 / 0.97)
		);
		mask-image: linear-gradient(
			to bottom,
			transparent calc(100% - var(--fade-height)),
			rgb(0 0 0 / 0.92) calc(100% - var(--fade-height) * 0.58),
			rgb(0 0 0 / 0.97)
		);
	}

	.screen {
		max-width: 480px;
		margin: 0 auto;
		padding: calc(env(safe-area-inset-top) + 28px) var(--page-gutter)
			calc(env(safe-area-inset-bottom) + 120px);
	}
</style>
