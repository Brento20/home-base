<script lang="ts">
	/**
	 * A plan's line drawing (motif.ts picks which), etched into the card's glass. Drawn at
	 * 64 × 64 with a line that stays the same weight at any size; the card sets its size and
	 * place, and can tint the line with `--motif-colour`. Purely decorative, so screen readers
	 * skip it.
	 */
	import type { Motif } from './motif.js';

	let { motif }: { motif: Motif } = $props();
</script>

<!--
	Etched into the glass: the drawing twice, a dark copy a hair higher (the groove's shadow) under
	a faint light one (the frosted line). Each copy fades as a whole, so crossing lines don't
	double up.
-->
{#snippet shapes()}
	{#if motif === 'gift'}
		<rect x="11" y="30" width="42" height="24" rx="2" />
		<rect x="8" y="22" width="48" height="9" rx="2" />
		<path d="M32 22v32" />
		<path d="M32 22c-5-9-15-8-12-1 2 3 8 2 12 1zM32 22c5-9 15-8 12-1-2 3-8 2-12 1z" />
	{:else if motif === 'bauble'}
		<circle cx="32" cy="39" r="16" />
		<rect x="28" y="18" width="8" height="5" rx="1" />
		<path d="M32 18c0-6 7-6 6-1" />
		<path d="M17 37c5 4 10 4 15 0s10-4 15 0" />
		<path d="M20 47c4 2 8 2 12 0s8-2 12 0" />
	{:else if motif === 'rings'}
		<circle cx="25" cy="39" r="12" />
		<circle cx="39" cy="39" r="12" />
		<path d="M35 20l4-6 4 6-4 4z" />
	{:else if motif === 'trophy'}
		<path d="M22 12h20v10a10 10 0 0 1-20 0z" />
		<path d="M22 15h-6a6 6 0 0 0 7 10M42 15h6a6 6 0 0 1-7 10" />
		<path d="M32 32v8M26 40h12v6H26zM22 52h20" />
		<path d="M32 46v6" />
	{:else if motif === 'controller'}
		<path
			d="M20 22h24c8 0 13 6 14 14l2 10c1 6-5 9-9 5l-6-6H19l-6 6c-4 4-10 1-9-5l2-10c1-8 6-14 14-14z"
		/>
		<path d="M18 31v9M13.5 35.5h9" />
		<circle cx="44" cy="32" r="2" />
		<circle cx="49" cy="38" r="2" />
	{:else if motif === 'boat'}
		<path d="M12 38h40l-6 9H18z" />
		<path d="M32 38V13" />
		<path d="M32 15l14 19H32" />
		<path d="M6 54c4-3 8-3 12 0s8 3 12 0 8-3 12 0 8 3 12 0" />
	{:else if motif === 'plane'}
		<path d="M8 30L56 12 44 52 31 38z" />
		<path d="M31 38L56 12M31 38v11l7-6" />
	{:else if motif === 'tent'}
		<path d="M6 52L24 22l10 15 8-11 16 26z" />
		<path d="M20 52l4-9 4 9" />
		<circle cx="47" cy="13" r="4" />
	{:else if motif === 'music'}
		<path d="M24 46V16l24-6v30M24 23l24-6" />
		<circle cx="19" cy="46" r="5" />
		<circle cx="43" cy="40" r="5" />
	{:else if motif === 'ticket'}
		<path d="M8 21h48v7a4 4 0 0 0 0 8v7H8v-7a4 4 0 0 0 0-8z" />
		<path d="M40 22v20" stroke-dasharray="2 3" />
		<path d="M16 30h16M16 35h10" />
	{:else if motif === 'cocktail'}
		<path d="M14 14h32L30 34z" />
		<path d="M30 34v16M22 50h16" />
		<circle cx="44" cy="14" r="5" />
		<path d="M20 20h20" />
	{:else if motif === 'dinner'}
		<circle cx="34" cy="34" r="16" />
		<circle cx="34" cy="34" r="10" />
		<path d="M9 13v9a3 3 0 0 0 6 0v-9M12 13v39" />
		<path d="M58 13c-4 4-5 14 0 17v22" />
	{:else if motif === 'coffee'}
		<path d="M14 26h30v12a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12z" />
		<path d="M44 30h4a5 5 0 0 1 0 10h-4" />
		<path d="M23 11c-3 4 3 6 0 10M31 11c-3 4 3 6 0 10" />
		<path d="M10 56h38" />
	{:else if motif === 'heart'}
		<path d="M32 52C11 38 10 19 21 16c5-1 9 2 11 6 2-4 6-7 11-6 11 3 10 22-11 36z" />
	{:else if motif === 'paw'}
		<path d="M32 33c-7 0-13 7-13 13 0 5 5 7 13 7s13-2 13-7c0-6-6-13-13-13z" />
		<circle cx="18" cy="27" r="4" />
		<circle cx="26" cy="18" r="4" />
		<circle cx="38" cy="18" r="4" />
		<circle cx="46" cy="27" r="4" />
	{:else if motif === 'house'}
		<path d="M10 32L32 12l22 20" />
		<path d="M16 27v25h32V27" />
		<path d="M27 52V38h10v14" />
	{/if}
{/snippet}

<svg class="plan-motif" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
	<g class="groove">{@render shapes()}</g>
	<g class="frost">{@render shapes()}</g>
</svg>

<style>
	.plan-motif {
		display: block;
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2.4;
		overflow: visible;
	}

	/* The same weight at any size. */
	.plan-motif :global(*) {
		vector-effect: non-scaling-stroke;
	}

	/* The groove's shadow, a hair above the line. */
	.groove {
		stroke: var(--etch-groove);
		opacity: var(--etch-groove-opacity);
		transform: translateY(-0.45px);
	}

	/* The frosted line itself: 7% white unless the card tints it. */
	.frost {
		stroke: var(--motif-colour, var(--etch-line));
		opacity: var(--motif-opacity, var(--etch-line-opacity));
		transition:
			stroke var(--duration-settle, 450ms) var(--ease-out),
			opacity var(--duration-settle, 450ms) var(--ease-out);
	}
</style>
