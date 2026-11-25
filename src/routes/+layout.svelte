<script lang="ts">
	import '@fontsource-variable/geist';
	import '#lib/styles/tokens.css';
	import '#lib/styles/base.css';
	import '#lib/styles/forms.css';
	import '#lib/styles/ai.css';
	import '#lib/styles/grouped.css';
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { markHydrated } from '#lib/copy/pick.js';
	import { applyDaypart } from '#lib/ui/daypart.js';
	import AppStatus from '#lib/ui/AppStatus.svelte';
	import { drift } from '#lib/ui/backdrop-drift.js';
	import { listenForHaptics } from '#lib/ui/haptics.js';
	import { preloadTabs, usePageTransitions } from '#lib/ui/page-transitions.js';
	import { installPress } from '#lib/ui/press.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	usePageTransitions();

	// When a form comes back with mistakes, take you to the first one (forms use novalidate, so
	// the app's own inline messages show instead of the browser's bubbles).
	$effect(() => {
		const form = page.form as { errors?: Record<string, unknown> } | null;
		if (!form?.errors || Object.keys(form.errors).length === 0) return;
		// After the page has finished redrawing (a form may remount to show what you typed).
		tick().then(() =>
			requestAnimationFrame(() => {
				const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
				first?.focus({ preventScroll: true });
				first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
			})
		);
	});

	onMount(() => {
		// From here on, each screen opened gets a fresh heading (src/lib/copy/pick.ts).
		markHydrated();
		applyDaypart();
		preloadTabs();
		const removePress = installPress();
		const stopHaptics = listenForHaptics();
		const timer = setInterval(applyDaypart, 5 * 60 * 1000);
		return () => {
			clearInterval(timer);
			removePress();
			stopHaptics();
		};
	});
</script>

<!-- The AI spectrum, used by the sparkle icon wherever AI is offered (see ai.css). -->
<svg class="ai-defs" aria-hidden="true" width="0" height="0">
	<defs>
		<linearGradient id="ai-spectrum" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#ff6ac1" />
			<stop offset="0.3" stop-color="#ffb259" />
			<stop offset="0.55" stop-color="#6ee7b7" />
			<stop offset="0.8" stop-color="#6ab8ff" />
			<stop offset="1" stop-color="#a78bfa" />
		</linearGradient>
	</defs>
</svg>

<svelte:head>
	<title>home base</title>
</svelte:head>

<div class="app">
	<div class="app-backdrop backdrop-paint" aria-hidden="true" use:drift></div>
	{@render children()}
</div>

<AppStatus />

<style>
	.ai-defs {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
	}

	.app {
		position: relative;
		min-height: 100dvh;
		isolation: isolate;
	}

	/*
	 * Overhangs the bottom edge: some iOS versions stop a fixed layer's bottom short of the
	 * screen's (under the home indicator, or as Safari's toolbar slides away), which left a
	 * plain strip there. The glows count from the top, so the overhang changes nothing else.
	 */
	.app-backdrop {
		position: fixed;
		inset: 0 0 -160px;
		z-index: -1;
		transition: background-color var(--duration-settle) var(--ease-out);
	}
</style>
