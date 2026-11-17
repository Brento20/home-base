<script lang="ts">
	import GroupCard from '#lib/features/expenses/GroupCard.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import RoundButton from '#lib/ui/RoundButton.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Money · home base</title>
</svelte:head>

<PageHeader title="Money">
	{#snippet action()}
		<RoundButton icon="plus" label="New group" href="/money/new" />
	{/snippet}
</PageHeader>

{#if data.groups.length === 0}
	<p class="empty">
		Make a group for costs you share, like rent and groceries. Everyone in it can add expenses and
		see who owes whom.
	</p>
	<a class="button-primary" href="/money/new">Make a group</a>
{:else}
	<div class="groups">
		{#each data.groups as group (group.id)}
			<GroupCard {group} people={data.household.members} me={data.me.id} />
		{/each}
	</div>
{/if}

<style>
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
