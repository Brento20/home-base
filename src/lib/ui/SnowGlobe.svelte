<script lang="ts">
	/**
	 * The December snow globe behind every page, for anyone who's switched it on (Preferences).
	 * It sits between the backdrop and the page (z-index -1, like the backdrop, but later), so
	 * flakes drift behind the cards and melt into the edge fades. Off with Reduce Motion and with
	 * Reduce glow effects, and only in December (or for a short preview from Preferences). The
	 * engine is snow-globe.ts.
	 */
	import type { DisplayPrefs } from '#lib/display.js';
	import { askForMotion, motionAnswer, motionNeedsAsking, SnowGlobe } from './snow-globe.js';
	import { isDecember, isPreviewing, markSensed, setGlobe } from './snow.svelte.js';

	interface Props {
		prefs: DisplayPrefs;
	}

	let { prefs }: Props = $props();
	let canvas = $state<HTMLCanvasElement>();
	/** A thin strip in front of the tab bar, for the snow that builds up on top of it. */
	let ledge = $state<HTMLCanvasElement>();
	let still = $state(false);
	/** Switched off, but still fading out: the canvas stays until it's gone. */
	let fading = $state(false);

	$effect(() => {
		const query = matchMedia('(prefers-reduced-motion: reduce)');
		still = query.matches;
		const change = () => (still = query.matches);
		query.addEventListener('change', change);
		return () => query.removeEventListener('change', change);
	});

	const active = $derived(
		prefs.snowGlobe && !prefs.reduceGlow && !still && (isDecember() || isPreviewing())
	);

	$effect(() => {
		if (!active || !canvas) return;
		const root = document.documentElement;
		const globe = new SnowGlobe(canvas, {
			light: root.dataset.mode === 'light',
			onSensed: markSensed,
			ledgeCanvas: ledge,
			// Trying it out in Preferences: the close-up flake comes by straight away.
			heroSoon: isPreviewing()
		});
		globe.start();
		setGlobe(globe);
		// For checking the physics in development (the browser console, or the test scripts).
		if (import.meta.env.DEV) (window as unknown as { __snow?: SnowGlobe }).__snow = globe;

		// Light or dark changes the flake colour.
		const mode = new MutationObserver(() => globe.setLight(root.dataset.mode === 'light'));
		mode.observe(root, { attributeFilter: ['data-mode'] });

		// iOS may want asking again on a new launch: someone who's said yes before gets asked on
		// their first tap (no prompt when it's still allowed). Nobody else is ever prompted here.
		let ask: (() => void) | undefined;
		const check = setTimeout(() => {
			if (globe.hasMotion || !motionNeedsAsking() || motionAnswer() !== 'granted') return;
			ask = () => void askForMotion();
			window.addEventListener('pointerdown', ask, { once: true });
		}, 1500);

		return () => {
			clearTimeout(check);
			if (ask) window.removeEventListener('pointerdown', ask);
			mode.disconnect();
			setGlobe(null);
			fading = true;
			void globe.stop().then(() => (fading = false));
		};
	});
</script>

{#if active || fading}
	<canvas class="snow" aria-hidden="true" bind:this={canvas}></canvas>
	<canvas class="snow-ledge" aria-hidden="true" bind:this={ledge}></canvas>
{/if}

<style>
	.snow {
		position: fixed;
		inset: 0;
		z-index: -1;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	/* Moved to sit over the tab bar's top edge (snow-globe.ts); in front of the bar itself. */
	.snow-ledge {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 31;
		width: 100%;
		height: 28px;
		visibility: hidden;
		pointer-events: none;
	}
</style>
