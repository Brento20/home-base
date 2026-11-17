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
	}

	let { person, size = 32, dot = false }: Props = $props();
	let broken = $state(false);
	const hasPhoto = $derived(Boolean(person.avatarUrl) && !broken);
</script>

<!-- Their photo, or their initial on their colour when there's no photo (or it won't load). -->
<span
	class="avatar"
	class:dot={dot && !hasPhoto}
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
		color: #14100d;
		font-size: calc(var(--size) * 0.4);
		font-weight: var(--weight-strong);
		line-height: 1;
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
