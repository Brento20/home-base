<script lang="ts">
	/**
	 * A bar of actions pinned just above the tab bar, for screens with something to do at the
	 * bottom (a recipe's servings and actions, the cook view's Mark as cooked). It's styled as
	 * the tab bar's twin, so the two read as one set. `above` shows a notice over it.
	 * Give the page's content about 84px of bottom padding so its end clears the bar.
	 * `lift` (px) raises it to sit just above the on-screen keyboard instead, like the toolbar
	 * iOS shows over the keyboard (src/lib/ui/keyboard.svelte.ts measures it).
	 */
	import type { Snippet } from 'svelte';
	import { drift } from './backdrop-drift.js';

	interface Props {
		children: Snippet;
		above?: Snippet;
		/** The keyboard's height, when it's up: the dock rides on top of it. */
		lift?: number;
	}

	let { children, above, lift = 0 }: Props = $props();
</script>

<!-- The page melts away a little higher here, so nothing reads through the bar. -->
{#if !lift}
	<div class="dock-fade backdrop-paint" data-still="action-fade" aria-hidden="true" use:drift></div>
{/if}
<div class="action-dock" class:lifted={lift > 0} style:--lift="{lift}px" data-still="action-dock">
	{@render above?.()}
	<div class="action-bar">{@render children()}</div>
</div>

<style>
	/* Just above the tab bar: its 62px height and 12px gap, plus 10px of air. */
	.action-dock {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(env(safe-area-inset-bottom) + 12px + 62px + 10px);
		z-index: 28;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 0 var(--page-gutter);
		pointer-events: none;
	}

	/* On the keyboard: 8px clear of its top edge, the tab bar hidden behind it. */
	.action-dock.lifted {
		bottom: calc(var(--lift) + 8px);
	}

	.action-dock > :global(*) {
		width: min(100%, 420px);
		pointer-events: auto;
	}

	/*
	 * A backdrop fade from just above the bar down to the tab bar's own, the same trick as the
	 * app layout's edge fade, so the bar can stay see-through like the tab bar without a blur.
	 */
	/* Full-screen and masked to the bottom band, so its glows line up with the backdrop's. */
	.dock-fade {
		--fade-height: calc(env(safe-area-inset-bottom) + 12px + 62px + 10px + 62px + 36px);
		position: fixed;
		inset: 0;
		z-index: 26;
		pointer-events: none;
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent calc(100% - var(--fade-height)),
			rgb(0 0 0 / 0.85) calc(100% - var(--fade-height) * 0.7)
		);
		mask-image: linear-gradient(
			to bottom,
			transparent calc(100% - var(--fade-height)),
			rgb(0 0 0 / 0.85) calc(100% - var(--fade-height) * 0.7)
		);
	}

	/* The tab bar's twin: same height, fill, lit rim and shadow (TabBar.svelte). */
	.action-bar {
		position: relative;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 5px;
		border-radius: var(--radius-pill);
		background: var(--surface-bar);
		box-shadow:
			var(--glass-inner-light),
			0 14px 32px -14px var(--shadow-colour);
	}

	.action-bar::after {
		content: '';
		position: absolute;
		inset: 0;
		padding: var(--glass-rim-width);
		border-radius: inherit;
		background: var(--glass-rim);
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
		pointer-events: none;
	}

	.action-bar :global(form) {
		margin: 0;
	}

	/* Buttons are as tall as the tabs below and stay on one line. */
	.action-bar :global(.act) {
		min-height: 52px;
		padding: 0 14px;
		font-size: var(--text-small);
		white-space: nowrap;
	}

	/* Secondary actions sit plain in the bar, like the tabs that aren't selected. */
	.action-bar :global(.button-secondary.act) {
		border-color: transparent;
		background: none;
	}

	.action-bar :global(.button-secondary.act[data-pressed]) {
		background: var(--colour-fill);
	}
</style>
