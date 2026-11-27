<script lang="ts">
	/** Everyone's stars for a recipe: yours to tap (saves straight away), the others' to see. */
	import { enhance } from '$app/forms';
	import { save } from '#lib/ui/save.svelte.js';
	import Avatar from '#lib/ui/Avatar.svelte';
	import type { Profile } from '#lib/types.js';
	import Stars from './Stars.svelte';

	interface Props {
		title: string;
		ratings: { profileId: string; stars: number }[];
		people: Profile[];
		meId: string;
	}

	let { title, ratings, people, meId }: Props = $props();

	const starsFor = (profileId: string) =>
		ratings.find((rating) => rating.profileId === profileId)?.stars ?? null;
	const others = $derived(people.filter((person) => person.id !== meId));

	const rating = save();
</script>

<div class="ratings">
	<form method="POST" action="?/rate" class="rating mine" use:enhance={rating.enhance}>
		<span class="who">Your rating</span>
		<Stars value={starsFor(meId)} name="stars" label={title} size={22} autosubmit />
	</form>
	{#each others as person (person.id)}
		{@const stars = starsFor(person.id)}
		<div class="rating">
			<span class="who"><Avatar {person} size={20} dot /> {person.displayName}</span>
			{#if stars}
				<Stars value={stars} size={16} />
			{:else}
				<span class="unrated">Hasn’t rated it</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	.ratings {
		display: flex;
		flex-direction: column;
	}

	.rating {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-m);
		min-height: 52px;
		margin: 0;
		border-bottom: var(--hairline) solid var(--colour-separator);
	}

	.rating:last-child {
		border-bottom: 0;
	}

	.who {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	/* The tappable stars have padding around them; line their edge up with the others'. */
	.mine :global(.stars) {
		margin-right: -7px;
	}

	.unrated {
		font-size: var(--text-small);
		color: var(--colour-text-faint);
	}
</style>
