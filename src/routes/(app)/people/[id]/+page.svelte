<script lang="ts">
	/**
	 * Someone's public profile, for people who aren't friends yet: what they've chosen to share
	 * with anyone. Becoming friends takes a friend link, or going to a plan together.
	 */
	import ProfileHeader from '#lib/features/friends/ProfileHeader.svelte';
	import PublicFieldsCard from '#lib/features/friends/PublicFieldsCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const person = $derived(data.person);
	const facts = $derived([
		...(person.homeName ? [{ icon: 'home' as const, text: person.homeName }] : []),
		...(person.pronouns ? [{ text: person.pronouns }] : [])
	]);
</script>

<svelte:head>
	<title>{person.name} · home base</title>
</svelte:head>

<PageHeader title={person.name}>
	{#snippet lead()}
		<button class="button-quiet" type="button" onclick={() => history.back()}
			><Icon name="back" size={18} /> Back</button
		>
	{/snippet}
</PageHeader>

<div class="stack">
	<ProfileHeader
		person={{
			displayName: person.name,
			initials: person.initials,
			accentColour: person.colour,
			avatarUrl: person.avatarUrl
		}}
		name={person.name}
		bio={person.bio}
		{facts}
	/>
	<PublicFieldsCard fields={person.fields} label="About {person.name}" />
	{#if !person.sharesHome}
		<p class="explain">
			You’re not friends yet. Ask {person.name} for a friend link, or go to a plan together and add each
			other afterwards.
		</p>
	{/if}
</div>

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-l);
	}

	.explain {
		color: var(--colour-text-muted);
	}
</style>
