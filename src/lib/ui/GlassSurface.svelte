<script lang="ts">
	/**
	 * The glass body behind a card's content: a smoked, see-through fill, light caught inside
	 * the top edge, a specular rim drawn in CSS (bright at the top-left, softer at the
	 * bottom-right), and a soft drop shadow.
	 *
	 * No live blur. The backdrop is a soft gradient, so blurring it changed almost nothing you
	 * could see, while every card's blur had to be redrawn on every frame of scrolling, swiping
	 * and page changes, which is what made older iPhones stutter. A plain fill is drawn once.
	 * (Cards bent the backdrop with liquidglass.dev refraction before that, which was worse.)
	 */
	import { onMount } from 'svelte';

	interface Props {
		radius: number;
		/** The warm highlight, reserved for the next event and the leader. */
		glow?: boolean;
		/**
		 * Press feedback for tappable cards: the whole card, glass and content together, grows
		 * wider and shorter while it's pressed and springs back on release.
		 */
		squish?: boolean;
	}

	let { radius, glow = false, squish = false }: Props = $props();

	let slot = $state<HTMLElement>();

	// Wider and shorter while pressed, the same proportions the refracting glass used to squish by.
	const PRESSED = '1.025 0.97';
	const PRESSED_REDUCED = '0.985';

	/** The app's bouncy spring (tokens.css), with a stand-in where linear() easing isn't supported. */
	function springEasing() {
		const spring = getComputedStyle(document.documentElement)
			.getPropertyValue('--spring-bouncy')
			.trim();
		return CSS.supports('transition-timing-function', spring)
			? spring
			: 'cubic-bezier(0.34, 1.56, 0.64, 1)';
	}

	onMount(() => {
		const target = slot?.parentElement;
		if (!squish || !target) return;

		// The Web Animations API rather than a CSS transition, so a card's own `transition`
		// (highlights, colours) can't override the spring. `scale` adds to any transform the
		// card already has. Driven by pointer events: iOS Safari often skips :active on a tap.
		const reduced = matchMedia('(prefers-reduced-motion: reduce)');
		const easing = springEasing();
		let animation: Animation | undefined;

		const press = () => {
			animation?.cancel();
			animation = target.animate(
				[{ scale: '1' }, { scale: reduced.matches ? PRESSED_REDUCED : PRESSED }],
				{
					duration: 110,
					easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
					fill: 'forwards'
				}
			);
		};
		const release = () => {
			if (!animation) return;
			// Spring back from wherever the press got to.
			const from = getComputedStyle(target).scale;
			animation.cancel();
			animation = target.animate([{ scale: from === 'none' ? '1' : from }, { scale: '1' }], {
				duration: reduced.matches ? 160 : 620,
				easing: reduced.matches ? 'ease-out' : easing
			});
			animation.onfinish = () => (animation = undefined);
		};

		const ends = ['pointerup', 'pointercancel', 'pointerleave'] as const;
		target.addEventListener('pointerdown', press);
		for (const type of ends) target.addEventListener(type, release);
		return () => {
			animation?.cancel();
			target.removeEventListener('pointerdown', press);
			for (const type of ends) target.removeEventListener(type, release);
		};
	});
</script>

<span
	class="glass-slot"
	class:glow
	bind:this={slot}
	style:--surface-radius="{radius}px"
	aria-hidden="true"
></span>

<style>
	.glass-slot {
		position: absolute;
		inset: 0;
		z-index: 0;
		display: block;
		border-radius: var(--surface-radius);
		background: var(--glass-body);
		box-shadow: var(--glass-inner-light), var(--shadow-lift);
		pointer-events: none;
	}

	/* The rim: a 1.25px ring whose brightness runs from the top-left light down to the far edge. */
	.glass-slot::after {
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
	}

	.glow {
		background: linear-gradient(180deg, var(--colour-accent-soft), var(--glass-body));
		box-shadow: var(--glass-inner-light), var(--glow-event);
	}

	.glow::after {
		background: var(--glass-rim-warm);
	}
</style>
