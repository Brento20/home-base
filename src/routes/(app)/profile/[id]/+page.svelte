<script lang="ts">
	/**
	 * A friend: their colour, photo, name and the line about themselves, their home's name and
	 * since when, then every postcard between you (either way), and Send a postcard. Removing or
	 * blocking them is at the foot.
	 */
	import PostcardList from '#lib/features/friends/PostcardList.svelte';
	import ProfileHeader from '#lib/features/friends/ProfileHeader.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import { LOCALE } from '#lib/home.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const friend = $derived(data.friend);
	const since = $derived(
		new Date(friend.friendsSince).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
	);
	const facts = $derived([
		...(friend.homeName ? [{ icon: 'home' as const, text: friend.homeName }] : []),
		{ text: `Friends since ${since}` }
	]);
	const nameOf = (id: string | null) => (id === friend.id ? friend.name : null);
</script>

<svelte:head>
	<title>{friend.name} · home base</title>
</svelte:head>

<PageHeader title={friend.name}>
	{#snippet lead()}
		<a class="button-quiet" href="/profile"><Icon name="back" size={18} /> Friends</a>
	{/snippet}
</PageHeader>

<div class="stack">
	<ProfileHeader
		person={{
			displayName: friend.name,
			initials: friend.initials,
			accentColour: friend.colour,
			avatarUrl: friend.avatarUrl
		}}
		name={friend.name}
		bio={friend.bio}
		{facts}
	/>

	{#if data.sent}
		<p class="sent" role="status">Postcard sent. It’s on {friend.name}’s home feed now.</p>
	{/if}

	{#if friend.homeName}
		<a class="button-primary button-block send" href="/postcards/new?to={friend.id}">
			<Icon name="compose" size={18} /> Send a postcard
		</a>
	{:else}
		<p class="explain">
			{friend.name} isn’t in a home yet, so there’s no feed to send a postcard to.
		</p>
	{/if}

	<section aria-labelledby="between-heading">
		<h2 id="between-heading" class="section-heading">Postcards between you</h2>
		{#if data.postcards.length}
			<PostcardList postcards={data.postcards} me={data.me.id} {nameOf} />
		{:else}
			<p class="explain">None yet. Send the first one.</p>
		{/if}
	</section>
	{#if form?.message}<p class="field-error" role="alert">{form.message}</p>{/if}
</div>

<ConfirmDelete action="?/remove" label="Remove friend" confirmLabel="Tap again to remove" />
<ConfirmDelete action="?/block" label="Block {friend.name}" confirmLabel="Tap again to block" />
<p class="note">
	Blocking removes {friend.name} from your friends, takes their postcards off your feed, and stops them
	adding you again.
</p>

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-l);
	}

	.send {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.sent {
		color: var(--colour-accent);
	}

	.explain {
		color: var(--colour-text-muted);
	}

	.note {
		margin-top: var(--space-s);
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}
</style>
