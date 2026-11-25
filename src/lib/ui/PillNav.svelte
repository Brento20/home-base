<script lang="ts" generics="T extends { href: string }">
	/**
	 * A row of links with a glass pill that slides to the current one: the tab bar and the
	 * Lists | Tasks switch.
	 *
	 * All CSS: the pill moves with a transform on a soft spring (a slight settle, no bounce),
	 * which the phone's compositor runs without the main thread, so it never stutters a page
	 * change. It sets off the moment a navigation starts (tap or swipe) instead of waiting for
	 * the next page's data, and goes back if that navigation doesn't happen.
	 */
	import { tick, type Snippet } from 'svelte';
	import { beforeNavigate } from '$app/navigation';

	interface Props {
		items: T[];
		/** The item for a URL, or -1 for none. */
		indexFor: (url: {
			pathname: string;
			href: string;
			searchParams: { get(name: string): string | null };
		}) => number;
		current: number;
		label: string;
		variant: 'tabs' | 'segmented';
		item: Snippet<[T, boolean]>;
	}

	let { items, indexFor, current, label, variant, item }: Props = $props();

	let heading = $state<number | null>(null);
	const shown = $derived(heading ?? current);

	// The pill heads off when the navigation starts and holds there until the page's URL has
	// caught up. (Letting go when the navigation completes was a frame too early: the URL still
	// named the old tab, so the pill hopped back and set off a second time.)
	$effect.pre(() => {
		if (heading !== null && current === heading) heading = null;
	});

	beforeNavigate((navigation) => {
		const next = navigation.to ? indexFor(navigation.to.url) : -1;
		if (next < 0 || next === current) return;
		heading = next;
		const giveUp = () => {
			if (heading === next) heading = null;
		};
		// It didn't happen, or it ended up somewhere else (a redirect): back to the real tab.
		navigation.complete.then(() => tick().then(() => current !== next && giveUp()), giveUp);
	});
</script>

<nav class="pill-nav {variant}" aria-label={label} style:--count={items.length} style:--at={shown}>
	{#if shown >= 0}<span class="pill" aria-hidden="true"></span>{/if}
	{#each items as entry, index (entry.href)}
		<a
			href={entry.href}
			class:on={index === shown}
			aria-current={index === current ? 'page' : undefined}
		>
			{@render item(entry, index === shown)}
		</a>
	{/each}
</nav>

<style>
	.pill-nav {
		--inset: 5px;
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--count), minmax(0, 1fr));
		padding: var(--inset);
		border-radius: var(--radius-pill);
		color: var(--colour-text-muted);
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
	}

	.pill {
		position: absolute;
		top: var(--inset);
		bottom: var(--inset);
		left: var(--inset);
		width: calc((100% - 2 * var(--inset)) / var(--count));
		border-radius: var(--radius-pill);
		background: var(--pill-on);
		box-shadow:
			var(--pill-on-edge),
			0 6px 16px -8px var(--shadow-colour);
		transform: translateX(calc(var(--at) * 100%));
		transition: transform 440ms var(--spring-soft);
	}

	a {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		color: inherit;
		text-decoration: none;
		transition:
			color var(--duration-quick) var(--ease-out),
			transform var(--duration-release) var(--spring-gentle);
		-webkit-tap-highlight-color: transparent;
	}

	/* The tab under your finger sinks a touch while the pill sets off towards it. */
	a:global([data-pressed]) {
		transform: scale(0.92);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}

	a.on {
		color: var(--colour-accent);
	}

	a:focus-visible {
		outline: 2px solid var(--colour-accent);
		outline-offset: -2px;
	}

	.tabs a {
		flex-direction: column;
		gap: 4px;
		height: 52px;
		font-size: 11px;
		font-weight: var(--weight-medium);
		line-height: 1;
		letter-spacing: var(--tracking-label);
	}

	.segmented {
		display: inline-grid;
	}

	.segmented a {
		height: 34px;
		padding: 0 20px;
		font-size: var(--text-small);
	}

	/* The pill stays slim, but the tap area reaches the outline: 44px tall. */
	.segmented a::after {
		content: '';
		position: absolute;
		inset: calc(var(--inset) * -1) 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.pill {
			transition: none;
		}
	}
</style>
