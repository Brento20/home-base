<script lang="ts">
	/**
	 * An icon from the set, etched into a card's glass: the faint drawing in the corner of a plan
	 * or chore card (meaning.ts picks which). The card sets its size and place, and can tint the
	 * line with `--motif-colour`. The line is the same weight at any size, so every card's
	 * etching matches. Purely decorative, so screen readers skip it.
	 */
	import { GLYPHS, type GlyphId } from './glyphs.js';

	let { icon }: { icon: GlyphId } = $props();
	const body = $derived(GLYPHS[icon]);
</script>

<!--
	Etched into the glass: the drawing twice, a dark copy a hair higher (the groove's shadow) under
	a faint light one (the frosted line). Each copy fades as a whole, so crossing lines don't
	double up.
-->
<svg class="etching" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- the set's own drawings, cleaned when generated (tools/make_icons.py) -->
	<g class="groove">{@html body}</g>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- as above -->
	<g class="frost">{@html body}</g>
</svg>

<style>
	.etching {
		display: block;
		width: 100%;
		height: auto;
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2px;
		overflow: visible;
	}

	/* The same weight at any size. */
	.etching :global(*) {
		vector-effect: non-scaling-stroke;
	}

	/* The groove's shadow, a hair above the line. */
	.groove {
		stroke: var(--etch-groove);
		color: var(--etch-groove);
		opacity: var(--etch-groove-opacity);
		transform: translateY(-0.45px);
	}

	/* The frosted line itself: 7% white unless the card tints it. */
	.frost {
		stroke: var(--motif-colour, var(--etch-line));
		color: var(--motif-colour, var(--etch-line));
		opacity: var(--motif-opacity, var(--etch-line-opacity));
		transition:
			stroke var(--duration-settle, 450ms) var(--ease-out),
			color var(--duration-settle, 450ms) var(--ease-out),
			opacity var(--duration-settle, 450ms) var(--ease-out);
	}
</style>
