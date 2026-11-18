<script lang="ts">
	/**
	 * The tab bar: Today, Plans, Lists, Money, Home. The URL decides the active tab.
	 *
	 * A frosted bar with a lit rim and a glass pill that springs between tabs (PillNav). It's the
	 * only blurred surface that stays on screen, so it's the one place the app pays for a live
	 * backdrop blur; everything about it is plain CSS that the phone's compositor runs.
	 */
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import PillNav from './PillNav.svelte';
	import { TABS, tabIndexFor } from './tabs.js';

	const current = $derived(tabIndexFor(page.url.pathname));
</script>

<div class="tab-bar-dock">
	<div class="tab-bar">
		<PillNav items={TABS} indexFor={tabIndexFor} {current} label="Main" variant="tabs">
			{#snippet item(tab)}
				<Icon name={tab.icon} />
				<span>{tab.label}</span>
			{/snippet}
		</PillNav>
	</div>
</div>

<style>
	.tab-bar-dock {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(env(safe-area-inset-bottom) + 12px);
		/* Above the page and anything on it, on a layer of its own, so content scrolling under
		   the bar (cards that animate get layers too) can never be drawn over it on iOS. */
		z-index: 30;
		transform: translateZ(0);
		display: flex;
		justify-content: center;
		padding: 0 var(--page-gutter);
		pointer-events: none;
	}

	.tab-bar {
		position: relative;
		width: min(100%, 420px);
		border-radius: var(--radius-pill);
		background: rgb(20 15 13 / 0.72);
		-webkit-backdrop-filter: blur(20px) saturate(150%);
		backdrop-filter: blur(20px) saturate(150%);
		box-shadow:
			var(--glass-inner-light),
			0 14px 32px -14px rgb(0 0 0 / 0.7);
		pointer-events: auto;
	}

	/* The same lit rim as the cards. */
	.tab-bar::after {
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

	.tab-bar :global(.pill-nav) {
		box-shadow: none;
	}
</style>
