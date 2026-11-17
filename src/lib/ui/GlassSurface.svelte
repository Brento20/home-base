<script lang="ts">
	/**
	 * A decorative liquid-glass body that sits behind a card's content.
	 * <lg-panel> gets no children, so liquidglass.dev never rearranges DOM that Svelte owns.
	 *
	 * Optics sit between the skill's "glass card" row and the liquidglass.dev lens demo: a deep
	 * curved rim (bezel) that visibly bends the backdrop, a colour fringe (chroma) and a bright
	 * directional highlight, with only light frost so the bending isn't blurred away. Content
	 * sits above the glass, so it's never distorted.
	 */
	import { onMount, untrack } from 'svelte';
	import { glassTurn, loadGlass } from './glass.js';
	import { transitionSettled } from './page-transitions.js';

	interface Props {
		radius: number;
		/** Frost in px. 0 is clear glass. */
		blur?: number;
		/** Maximum bend at the rim, px. */
		refraction?: number;
		/** Width of the curved rim as a share of half the short side. Lower for small fields. */
		bezel?: number;
		glow?: boolean;
		/**
		 * Press feedback for tappable cards: the glass grows wider and shorter while the
		 * card is pressed and springs back on release (the skill's press squish).
		 */
		squish?: boolean;
		/**
		 * Only build real glass while the card is on or near the screen. Long lists stay
		 * within the skill's "a few dozen glass elements per page"; off-screen cards get
		 * the frosted fallback, which looks the same at a glance.
		 */
		lazy?: boolean;
	}

	let {
		radius,
		blur = 1,
		refraction = 32,
		bezel = 0.55,
		glow = false,
		squish = false,
		lazy = false
	}: Props = $props();

	let slot = $state<HTMLElement>();
	let panel = $state<
		HTMLElement & { surface?: { setDelta(delta: Record<string, number>): void } }
	>();
	// Real glass waits for the page transition to finish: building it mid-slide (lens maps, the
	// backdrop copy, SVG filters) blocks the frames that move the page, which stutters on iPhone.
	// Until then the card shows the frosted fallback, which looks the same while it's moving.
	// Cards then take turns, one per frame, so the glass doesn't all build in one long frame.
	let settled = $state(false);
	let inView = $state(untrack(() => !lazy));
	const visible = $derived(settled && inView);

	onMount(() => {
		const cleanups: (() => void)[] = [];
		let unmounted = false;
		cleanups.push(() => (unmounted = true));
		transitionSettled()
			.then(glassTurn)
			.then(() => {
				if (!unmounted) settled = true;
			});

		if (lazy && slot && 'IntersectionObserver' in window) {
			const observer = new IntersectionObserver(([entry]) => (inView = entry.isIntersecting), {
				rootMargin: '240px 0px'
			});
			observer.observe(slot);
			cleanups.push(() => observer.disconnect());
		} else {
			inView = true;
		}

		if (squish && slot?.parentElement) {
			const target = slot.parentElement;
			// Lets base.css hide the card's own outline while the glass squishes, so only the
			// glass rim (which squishes with it) shows as the edge.
			target.dataset.pressable = '';
			let cancelled = false;
			loadGlass()
				.then(() => import('#lib/vendor/liquid-glass/liquid-glass.js'))
				.then(({ createSpring }) => {
					if (cancelled) return;
					// Wider and shorter while pressed, then a soft wobble back on release. x stays
					// within the panel's 4px bleed so the squished rim is never clipped.
					// data-pressed stays on from the press until the spring comes to rest (it reports
					// exactly 0 then), wobble included, so base.css hides the card's outline for as long
					// as the glass is out of shape. Not :active, which iOS Safari often skips on a tap.
					const spring = createSpring(
						0,
						(p) => {
							panel?.surface?.setDelta({ x: -4 * p, y: 2.5 * p, w: 8 * p, h: -5 * p });
							target.toggleAttribute('data-pressed', p !== 0);
						},
						{ stiffness: 520, damping: 20 }
					);
					const press = () => {
						target.setAttribute('data-pressed', '');
						spring.set(1);
					};
					const release = () => spring.set(0);
					target.addEventListener('pointerdown', press);
					for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
						target.addEventListener(type, release);
					}
					cleanups.push(() => {
						target.removeEventListener('pointerdown', press);
						for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
							target.removeEventListener(type, release);
						}
					});
				})
				.catch(() => {
					// No glass engine: the card still works, just without the squish.
				});
			cleanups.push(() => (cancelled = true));
		}

		return () => cleanups.forEach((cleanup) => cleanup());
	});
</script>

<span class="glass-slot" bind:this={slot} style:--surface-radius="{radius}px" aria-hidden="true">
	{#if visible}
		<lg-panel
			bind:this={panel}
			class="glass-surface"
			class:glow
			{radius}
			blur={String(blur)}
			refraction={String(refraction)}
			bezel={String(bezel)}
			curvature="4"
			chroma="0.22"
			specular="0.75"
			specular-width="2"
		></lg-panel>
	{:else}
		<span class="glass-fallback" class:glow></span>
	{/if}
</span>

<style>
	.glass-slot {
		position: absolute;
		inset: 0;
		z-index: 0;
		display: block;
		border-radius: var(--surface-radius);
		pointer-events: none;
	}

	.glass-surface,
	.glass-fallback {
		position: absolute;
		inset: 0;
		display: block;
		border-radius: var(--surface-radius);
	}

	.glass-fallback {
		background: var(--glass-smoke-fallback);
		-webkit-backdrop-filter: var(--glass-blur);
		backdrop-filter: var(--glass-blur);
		box-shadow: var(--shadow-lift);
	}

	/* The warm highlight is reserved for the next event. */
	.glow {
		--lg-shadow-2: var(--glow-event);
		--lg-tint: linear-gradient(180deg, var(--colour-accent-soft), rgb(11 8 7 / 0.28));
	}

	.glass-surface:not(:defined).glow,
	.glass-fallback.glow {
		box-shadow: var(--glow-event);
	}
</style>
