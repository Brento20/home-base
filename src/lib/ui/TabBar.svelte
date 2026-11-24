<script lang="ts">
	/**
	 * The tab bar: Today, Plans, Lists, Money, Home. The URL decides the active tab.
	 *
	 * A frosted bar with a lit rim and a glass pill that glides between tabs (PillNav).
	 *
	 * The page fades out before it reaches the bar (the edge fades in the app layout), so only a
	 * soft ghost of it passes behind the frost. That matters on iOS, where Safari now and then
	 * drops a fixed element's blur and fill for a frame as content scrolls under it: with the
	 * page already faded, there's nothing sharp to flash through.
	 */
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import PillNav from './PillNav.svelte';
	import { TABS, tabIndexFor } from './tabs.js';

	interface Props {
		/** Friend requests waiting: a dot on the Home tab. */
		homeDot?: number;
	}

	let { homeDot = 0 }: Props = $props();
	const current = $derived(tabIndexFor(page.url.pathname));
</script>

<div class="tab-bar-dock">
	<div class="tab-bar" data-still="tab-bar">
		<PillNav
			items={TABS}
			indexFor={(url) => tabIndexFor(url.pathname)}
			{current}
			label="Main"
			variant="tabs"
		>
			{#snippet item(tab)}
				<span class="icon">
					<Icon name={tab.icon} />
					{#if tab.href === '/home' && homeDot}
						<span
							class="dot"
							role="img"
							aria-label="{homeDot} friend request{homeDot === 1 ? '' : 's'} waiting"
						></span>
					{/if}
				</span>
				<span>{tab.label}</span>
			{/snippet}
		</PillNav>
	</div>
</div>

<style>
	.icon {
		position: relative;
		display: inline-flex;
	}

	.dot {
		position: absolute;
		top: -1px;
		right: -4px;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--colour-accent);
		box-shadow: 0 0 0 2px var(--surface-raised);
	}

	.tab-bar-dock {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(env(safe-area-inset-bottom) + 12px);
		/* Above the page and its edge fades. */
		z-index: 30;
		display: flex;
		justify-content: center;
		padding: 0 var(--page-gutter);
		pointer-events: none;
	}

	.tab-bar {
		position: relative;
		width: min(100%, 420px);
		border-radius: var(--radius-pill);
		background: var(--surface-bar);
		-webkit-backdrop-filter: blur(20px) saturate(150%);
		backdrop-filter: blur(20px) saturate(150%);
		/* Its own layer for good, so iOS doesn't re-rasterise it (and drop the blur) mid-scroll. */
		transform: translateZ(0);
		will-change: transform;
		box-shadow:
			var(--glass-inner-light),
			0 14px 32px -14px var(--shadow-colour);
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
