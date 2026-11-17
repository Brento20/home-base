<script lang="ts">
	import NoteCard from '#lib/features/notes/NoteCard.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import RoundButton from '#lib/ui/RoundButton.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.household.name} · home base</title>
</svelte:head>

<PageHeader title={data.household.name}>
	{#snippet action()}
		<RoundButton icon="plus" label="New note" href="/home/notes/new" />
	{/snippet}
</PageHeader>

<a class="people" href="/home/settings" aria-label="Everyone in {data.household.name}">
	{#each data.household.members as person (person.id)}
		<span class="person">
			<Avatar {person} size={40} />
			<span class="name">{person.displayName}</span>
		</span>
	{/each}
</a>

<section class="notes" aria-labelledby="notes-heading">
	<h2 id="notes-heading" class="section-label">Notes</h2>
	{#if data.notes.length === 0}
		<p class="empty">
			Add the wifi password, bin nights, where the spare key lives. Everyone here can see them.
		</p>
		<a class="button-secondary" href="/home/notes/new">Add a note</a>
	{:else}
		<div class="note-list">
			{#each data.notes as note (note.id)}
				<NoteCard {note} />
			{/each}
		</div>
	{/if}
</section>

<nav class="more" aria-label="Account">
	<a href="/home/profile">Edit your profile</a>
	<a href="/home/settings">Home settings</a>
	{#if !data.sampleMode}
		<form method="POST" action="/logout"><button>Sign out</button></form>
	{/if}
</nav>

<style>
	.people {
		display: flex;
		gap: var(--space-m);
		margin: calc(var(--space-s) * -1) -4px 0;
		padding: 4px;
		overflow-x: auto;
		color: inherit;
		text-decoration: none;
		scrollbar-width: none;
	}

	.person {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		min-width: 52px;
	}

	.name {
		max-width: 64px;
		overflow: hidden;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.notes {
		margin-top: var(--space-xl);
	}

	.section-label {
		margin-bottom: var(--space-m);
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	.empty {
		max-width: 32ch;
		margin-bottom: var(--space-m);
		color: var(--colour-text-muted);
	}

	.note-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.more {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		margin-top: var(--space-2xl);
		padding-top: var(--space-m);
		border-top: 1px solid var(--colour-hairline);
	}

	.more a,
	.more button {
		display: flex;
		align-items: center;
		min-height: var(--tap-target);
		padding: 0;
		border: 0;
		background: none;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
		text-decoration: none;
	}
</style>
