<script lang="ts">
	import type { Profile } from '#lib/types.js';

	interface Props {
		person: Pick<Profile, 'displayName' | 'initials' | 'accentColour' | 'avatarUrl'>;
		/** Diameter in px. */
		size?: number;
		/**
		 * For small spots beside a name: with no photo, show a plain 10px dot in their colour
		 * instead of an initial, which would be too small to read.
		 */
		dot?: boolean;
		/**
		 * A thin ring in their colour, a little out from the edge (as Fitness rings a friend), so
		 * you can tell whose it is at a glance, photo or not. It sits outside `size`: leave about
		 * 4px around it.
		 */
		ring?: boolean;
	}

	let { person, size = 32, dot = false, ring = false }: Props = $props();
	let broken = $state(false);
	const hasPhoto = $derived(Boolean(person.avatarUrl) && !broken);
</script>

<!-- Their photo, or their initial on their colour when there's no photo (or it won't load). -->
<span
	class="avatar"
	class:dot={dot && !hasPhoto}
	class:ring={ring && !(dot && !hasPhoto)}
	style:--size="{size}px"
	style:--person-colour={person.accentColour}
	aria-hidden="true"
>
	{#if hasPhoto}
		<img src={person.avatarUrl} alt="" width={size} height={size} onerror={() => (broken = true)} />
	{:else if !dot}
		{person.initials}
	{/if}
</span>

<style>
	.avatar {
		display: grid;
		flex: none;
		place-items: center;
		width: var(--size);
		height: var(--size);
		overflow: hidden;
		border-radius: 50%;
		background: var(--person-colour);
		/* A pale person colour still has an edge on a light page. */
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
		color: var(--colour-on-ring);
		font-size: calc(var(--size) * 0.4);
		font-weight: var(--weight-strong);
		line-height: 1;
	}

	/*
	 * An outline, not a shadow, so the gap between face and ring is see-through on any
	 * background. Mixed a touch towards the text colour, so a pale colour (Silver) still shows
	 * on a light page and a deep one on a dark page.
	 */
	.ring {
		outline: 1.5px solid color-mix(in oklab, var(--person-colour) 80%, var(--colour-text));
		outline-offset: 2px;
	}

	.dot {
		width: 10px;
		height: 10px;
		margin: calc((var(--size) - 10px) / 2);
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
