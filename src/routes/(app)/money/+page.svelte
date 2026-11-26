<script lang="ts">
	import IconEtching from '#lib/icons/IconEtching.svelte';
	import GroupCard from '#lib/features/expenses/GroupCard.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import RoundButton from '#lib/ui/RoundButton.svelte';
	import { kept } from '#lib/ui/kept.svelte.js';
	import { arrive, changed, glide, leave } from '#lib/ui/motion.js';
	import Reveal from '#lib/ui/Reveal.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The copy this phone kept until fresh data lands (src/lib/ui/kept.svelte.ts).
	const screen = kept(
		() => 'money',
		() => data.screen
	);
</script>

<svelte:head>
	<title>Money · home base</title>
</svelte:head>

<PageHeader title="Money">
	{#snippet action()}
		<RoundButton icon="plus" label="New group" href="/money/new" />
	{/snippet}
</PageHeader>

<Reveal of={screen} placeholder={[84, 84]} gap={14} label="Loading money">
	{#snippet children({ groups })}
		{#if groups.length === 0}
			<span class="empty-motif"><IconEtching icon="split-expense" /></span>
			<p class="empty">
				Make a group for costs you share, like rent and groceries. Everyone in it can add expenses
				and see who owes whom.
			</p>
			<a class="button-primary" href="/money/new">Make a group</a>
		{:else}
			<div class="groups">
				{#each groups as group (group.id)}
					<div
						in:arrive
						out:leave
						animate:glide
						use:changed={`${group.name}|${group.myNetCents}|${group.memberIds.length}`}
					>
						<GroupCard {group} people={data.household.members} me={data.me.id} />
					</div>
				{/each}
			</div>
		{/if}
	{/snippet}
</Reveal>

<style>
	/* Empty screens get the cards' etched drawing, bolder, as their picture. */
	.empty-motif {
		display: block;
		width: 64px;
		margin-bottom: var(--space-m);
		--motif-colour: var(--colour-text);
		--motif-opacity: 0.22;
	}

	.empty {
		max-width: 32ch;
		margin-bottom: var(--space-l);
		color: var(--colour-text-muted);
	}

	.groups {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
</style>
