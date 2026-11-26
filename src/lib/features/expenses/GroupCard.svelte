<script lang="ts">
	/** One expense group on the Money tab: its name, who's in it, and where you stand. */
	import Avatar from '#lib/ui/Avatar.svelte';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { ExpenseGroupSummary, Profile } from '#lib/types.js';
	import { describeBetween, describeMyBalance } from './describe.js';

	interface Props {
		group: ExpenseGroupSummary;
		people: Profile[];
		me: string;
	}

	let { group, people, me }: Props = $props();

	const members = $derived(
		group.memberIds
			.map((id) => people.find((person) => person.id === id))
			.filter((person): person is Profile => Boolean(person))
	);
	// Two people: "Chris owes you $10.00". More: your overall position.
	const balanceText = $derived.by(() => {
		const others = members.filter((person) => person.id !== me);
		return members.length === 2 && others.length === 1
			? describeBetween(group.myNetCents, others[0].displayName)
			: describeMyBalance(group.myNetCents);
	});
	const tone = $derived(group.myNetCents > 0 ? 'owed' : group.myNetCents < 0 ? 'owe' : 'settled');
</script>

<a class="group-card" href="/money/{group.id}">
	<GlassSurface radius={24} squish />
	<span class="body">
		<span class="text">
			<span class="name">{group.name}</span>
			<span class="balance {tone}">{balanceText}</span>
		</span>
		<span class="people" aria-label="{members.length} people">
			{#each members.slice(0, 4) as person, index (person.id)}
				<span class="stacked" style:z-index={4 - index}><Avatar {person} size={30} ring /></span>
			{/each}
		</span>
		<Icon name="chevron" size={18} />
	</span>
</a>

<style>
	.group-card {
		position: relative;
		display: block;
		border-radius: var(--radius-tile);
		color: inherit;
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}

	.body {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 84px;
		padding: 16px 16px 16px 20px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 var(--hairline) var(--colour-separator),
			var(--glass-highlight);
	}

	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.name {
		overflow: hidden;
		font-size: var(--text-body);
		font-weight: var(--weight-strong);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.balance {
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.balance.owed {
		color: var(--colour-accent);
	}

	.people {
		display: flex;
	}

	/* Overlapping, first person on top. */
	.stacked {
		position: relative;
		display: flex;
		border-radius: 50%;
		/* Cuts each ring clear of the face it overlaps. */
		box-shadow: 0 0 0 4.5px var(--colour-ground);
	}

	.stacked:not(:first-child) {
		margin-left: -4px;
	}

	.body > :global(.icon) {
		color: var(--colour-text-faint);
	}
</style>
