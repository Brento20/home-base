<script lang="ts">
	import '@fontsource-variable/geist';
	import '#lib/styles/tokens.css';
	import '#lib/styles/base.css';
	import '#lib/styles/forms.css';
	import { onMount } from 'svelte';
	import { markHydrated } from '#lib/copy/pick.js';
	import { applyDaypart } from '#lib/ui/daypart.js';
	import AppStatus from '#lib/ui/AppStatus.svelte';
	import { preloadTabs, usePageTransitions } from '#lib/ui/page-transitions.js';
	import { installPress } from '#lib/ui/press.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	usePageTransitions();

	onMount(() => {
		// From here on, each screen opened gets a fresh heading (src/lib/copy/pick.ts).
		markHydrated();
		applyDaypart();
		preloadTabs();
		const removePress = installPress();
		const timer = setInterval(applyDaypart, 5 * 60 * 1000);
		return () => {
			clearInterval(timer);
			removePress();
		};
	});
</script>

<svelte:head>
	<title>home base</title>
</svelte:head>

<div class="app">
	<div class="app-backdrop" aria-hidden="true"></div>
	{@render children()}
</div>

<AppStatus />

<style>
	.app {
		position: relative;
		min-height: 100dvh;
		isolation: isolate;
		/* Rows that bleed past the screen (the Today carousel) never make the page scroll sideways. */
		overflow-x: clip;
	}

	.app-backdrop {
		position: fixed;
		inset: 0;
		z-index: -1;
		background-color: var(--colour-ground);
		background-image: var(--grain), var(--mesh-one), var(--mesh-two), var(--mesh-three);
		background-size:
			var(--grain-size) var(--grain-size),
			100% 100%,
			100% 100%,
			100% 100%;
		background-repeat: repeat, no-repeat, no-repeat, no-repeat;
		transition: background-color var(--duration-settle) var(--ease-out);
	}
</style>
