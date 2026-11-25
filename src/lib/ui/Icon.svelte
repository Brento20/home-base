<script lang="ts" module>
	import { GLYPHS, type GlyphId } from '#lib/icons/glyphs.js';

	/**
	 * The app's own names for its icons, and the Home Base icon set's drawing each one uses
	 * (src/lib/icons, from tools/icons). A few the set doesn't have are drawn here in the same
	 * hand: the 24-unit grid, the 1.5 stroke, round ends, solid detail dots.
	 */
	const APP_ICONS = {
		today: 'sun',
		plans: 'calendar',
		lists: 'checklist',
		money: 'wallet',
		home: 'home',
		check: 'check',
		plus: 'plus',
		chevron: 'chevron-right',
		back: 'chevron-left',
		repeat: 'repeat',
		close: 'close',
		compose: 'create-post',
		more: 'more',
		dinner: 'utensils',
		star: 'star',
		search: 'search',
		clock: 'clock',
		filter: 'filter',
		leaf: 'plant',
		sparkle: 'sparkles',
		camera: 'camera',
		wifi: 'wifi',
		phone: 'call',
		message: 'message',
		basket: 'groceries',
		archive: 'archive',
		share: 'share'
	} as const satisfies Record<string, GlyphId>;

	const DRAWN = {
		photo:
			'<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m3.75 16 4.6-4.6a1.5 1.5 0 0 1 2.1 0L16.5 17.5"/><path d="m14 15 1.55-1.55a1.5 1.5 0 0 1 2.1 0l2.6 2.6"/><circle cx="15.75" cy="9.5" r="1.25" fill="currentColor" stroke="none"/>',
		reply: '<path d="M9.5 6.5 4.5 11.5l5 5"/><path d="M4.75 11.5h8.75a6 6 0 0 1 6 6v1"/>',
		refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.25h-4.25"/>',
		minus: '<path d="M5 12h14"/>',
		qr: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><path d="M13.5 13.5h2.75v2.75M20 13.5v.01M13.5 20v.01M17 20h3v-3"/>'
	} as const;

	export type IconName = keyof typeof APP_ICONS | keyof typeof DRAWN;
</script>

<script lang="ts">
	interface Props {
		/** One of the app's names, or any icon in the set by its own name ("pokeball"). */
		name: IconName | GlyphId;
		size?: number;
		/** The selected state: the set's filled drawing where it has one, else a fill. */
		filled?: boolean;
		/** A chevron after words ("All plans ›"): trims its empty sides so it sits close to them. */
		trim?: boolean;
	}

	let { name, size = 22, filled = false, trim = false }: Props = $props();

	const glyph = $derived<GlyphId | null>(
		name in APP_ICONS
			? APP_ICONS[name as keyof typeof APP_ICONS]
			: name in GLYPHS
				? (name as GlyphId)
				: null
	);
	const fillId = $derived(glyph && `${glyph}-fill` in GLYPHS ? (`${glyph}-fill` as GlyphId) : null);
	const body = $derived(
		filled && fillId
			? GLYPHS[fillId]
			: glyph
				? GLYPHS[glyph]
				: (DRAWN[name as keyof typeof DRAWN] ?? '')
	);
</script>

<!--
	One weight everywhere: the set is drawn with a 1.5 stroke on a 24-unit grid, and everything
	here keeps it. The sparkle only ever means AI, so it's always drawn in the AI spectrum.
-->
<svg
	class="icon icon-{name}"
	class:trim
	style:--icon-size="{size}px"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill={filled && !fillId ? 'currentColor' : 'none'}
	stroke={name === 'sparkle' ? 'url(#ai-spectrum)' : 'currentColor'}
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- the set's own drawings, cleaned when generated (tools/make_icons.py) -->
	{@html body}
</svg>

<style>
	.icon {
		flex: none;
		display: block;
	}

	/* A chevron's stroke is narrow in its box: keep 2.5 units either side of it, not 8 or 9. */
	.trim {
		margin-inline: calc(var(--icon-size) * -6.5 / 24) calc(var(--icon-size) * -5.25 / 24);
	}

	/* A back link's chevron lines its stroke up with the page's text edge, as iOS does. */
	:global(.button-quiet) > .icon-back:first-child {
		margin-inline-start: calc(var(--icon-size) * -7.75 / 24);
		margin-inline-end: calc(var(--icon-size) * -5 / 24);
	}
</style>
