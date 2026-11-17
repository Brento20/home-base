<script lang="ts">
	/**
	 * The liquid glass tab bar: Today, Plans, Lists, Money, Home. The URL decides the active tab.
	 * The bar is a glass rod (the curved rim runs the full height, as the liquid-glass-web skill
	 * recommends for thin bars) and the indicator is a lens that visibly bends the icon under it.
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import { TABS, tabIndexFor } from './tabs.js';

	const activeIndex = $derived(tabIndexFor(page.url.pathname));

	type NavbarElement = HTMLElement & {
		setCurrent?: (index: number) => void;
		glass?: { update(options: Record<string, number>): void } | null;
		/** The indicator spring's current speed, and the method that draws it (liquid-glass internals). */
		v: number;
		render: () => void;
	};
	let navbar = $state<NavbarElement>();

	// The URL owns the active tab; the glass indicator follows it after every navigation.
	$effect(() => {
		if (activeIndex >= 0) navbar?.setCurrent?.(activeIndex);
	});

	/**
	 * The indicator's lens has no attributes, so its optics are set through the engine's public
	 * glass.update(). A little stronger than the default so the icon under it bends as it slides,
	 * while the label stays readable.
	 * No chroma: the indicator bends a transparent copy, and chroma needs an opaque layer.
	 */
	onMount(() => {
		let frame = 0;
		let tries = 0;
		const tune = () => {
			if (navbar?.glass) {
				navbar.glass.update({ refraction: 11, bezel: 0.7, specular: 0.85, specularWidth: 2 });
				// The indicator stretches with its speed. Left smooth, its size changes by a fraction
				// of a pixel every frame, and each new size redraws the lens map from scratch, which
				// stutters page changes on iPhone. Rounding the speed gives the stretch 4px steps:
				// four sizes, each drawn once and then reused from the engine's cache.
				const render = navbar.render.bind(navbar);
				navbar.render = () => {
					const speed = navbar!.v;
					navbar!.v = Math.round(speed / 160) * 160;
					render();
					navbar!.v = speed;
				};
			} else if (tries++ < 120) {
				frame = requestAnimationFrame(tune);
			}
		};
		customElements.whenDefined('lg-navbar').then(tune);
		return () => cancelAnimationFrame(frame);
	});
</script>

<div class="tab-bar-dock">
	<lg-navbar
		bind:this={navbar}
		class="tab-bar"
		aria-label="Main"
		radius="capsule"
		refraction="24"
		bezel="1"
		curvature="2.5"
		chroma="0.2"
		specular="0.9"
		specular-width="2.5"
	>
		{#each TABS as tab, index (tab.href)}
			<a href={tab.href} aria-current={index === activeIndex ? 'page' : undefined}>
				<Icon name={tab.icon} />
				<span>{tab.label}</span>
			</a>
		{/each}
	</lg-navbar>
</div>

<style>
	.tab-bar-dock {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(env(safe-area-inset-bottom) + 12px);
		z-index: 10;
		display: flex;
		justify-content: center;
		padding: 0 var(--page-gutter);
		pointer-events: none;
		/* Page transitions leave the bar where it is (see base.css). */
		view-transition-name: tab-bar;
	}

	/* liquidglass.dev builds the copy layer at runtime, so these reach it with :global. */
	.tab-bar-dock :global(lg-navbar.tab-bar) {
		pointer-events: auto;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 4px;
		width: min(100%, 420px);
		padding: 6px;
		border-radius: var(--radius-pill);
		color: var(--colour-text-muted);
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
	}

	.tab-bar-dock :global(lg-navbar.tab-bar .lg-nav__copy) {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 4px;
		padding: 6px;
	}

	.tab-bar-dock :global(lg-navbar.tab-bar > a),
	.tab-bar-dock :global(lg-navbar.tab-bar .lg-nav__copy > span) {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		height: 52px;
		padding: 0;
		border-radius: 26px;
		font-size: 11px;
		font-weight: var(--weight-medium);
		line-height: 1;
		letter-spacing: var(--tracking-label);
	}

	/* Before the glass loads, the active tab is just tinted. */
	.tab-bar-dock :global(lg-navbar.tab-bar:not(:defined) > a[aria-current='page']) {
		color: var(--colour-accent);
	}
</style>
