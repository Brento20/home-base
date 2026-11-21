<script lang="ts">
	import { reform } from '#lib/ui/motion.js';
	import Avatar from '#lib/ui/Avatar.svelte';
	import type { Profile, Score } from '#lib/types.js';

	interface Props {
		people: Profile[];
		/** Null while the screen's data is on its way: just the faces, no numbers yet. */
		scores: Score[] | null;
	}

	let { people, scores }: Props = $props();

	const weekOf = (id: string) => scores?.find((score) => score.profileId === id)?.thisWeek ?? 0;
	const label = $derived(
		`Scores this week: ${people.map((person) => `${person.displayName} ${weekOf(person.id)}`).join(', ')}`
	);
</script>

<!-- Each avatar with this week's points; tap for the scoreboard. -->
<a class="score-avatars" href="/points" aria-label={label}>
	{#each people as person (person.id)}
		<span class="person">
			<Avatar {person} size={36} ring />
			{#if scores}
				{#key weekOf(person.id)}<span class="points" in:reform>{weekOf(person.id)}</span>{/key}
			{:else}
				<span class="points waiting" aria-hidden="true">&nbsp;</span>
			{/if}
		</span>
	{/each}
</a>

<style>
	.waiting {
		visibility: hidden;
	}

	.score-avatars {
		display: flex;
		align-items: center;
		gap: 14px;
		min-height: var(--tap-target);
		margin-right: -4px;
		padding: 0 4px;
		color: inherit;
		text-decoration: none;
	}

	.person {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.points {
		min-width: 1ch;
		font-size: var(--text-body);
		font-weight: var(--weight-strong);
		font-variant-numeric: tabular-nums;
	}
</style>
