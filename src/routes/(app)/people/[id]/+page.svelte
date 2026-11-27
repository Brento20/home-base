<script lang="ts">
	/**
	 * Someone's public profile, for people who aren't friends yet: what they've chosen to share
	 * with anyone, and a friend request: send one, or answer theirs.
	 */
	import { enhance } from '$app/forms';
	import { saveForm } from '#lib/ui/save.svelte.js';
	import ProfileHeader from '#lib/features/friends/ProfileHeader.svelte';
	import PublicFieldsCard from '#lib/features/friends/PublicFieldsCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
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
		<section class="friendship" aria-label="Friend request">
			{#if person.requestReceived}
				<p class="explain">{person.name} wants to be friends.</p>
				<form class="answer" method="POST" action="?/answer" use:enhance={saveForm}>
					<button class="button-secondary" name="accept" value="no">Decline</button>
					<button class="button-primary" name="accept" value="yes">Accept</button>
				</form>
			{:else if person.requestSent}
				<p class="explain">Request sent. You’ll be friends once {person.name} accepts.</p>
				<form method="POST" action="?/cancel" use:enhance={saveForm}>
					<button class="button-quiet danger">Cancel request</button>
				</form>
			{:else}
				<form method="POST" action="?/request" use:enhance={saveForm}>
					<button class="button-primary button-block">Send friend request</button>
				</form>
				<p class="hint">
					Friends see your photo, can send postcards to your home, and can invite you to plans.
				</p>
			{/if}
			{#if form?.message}<p class="field-error" role="alert">{form.message}</p>{/if}
		</section>
	{/if}
</div>

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-l);
	}

	.friendship {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
	}

	.answer {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.explain {
		color: var(--colour-text-muted);
	}

	.hint {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.danger {
		align-self: flex-start;
		padding-left: 0;
		color: var(--colour-danger);
	}
</style>
