<script lang="ts">
	/**
	 * A friend: who they are, their home's name, since when, and the things you can do: send a
	 * postcard to their home's feed, remove them, or block them.
	 */
	import Avatar from '#lib/ui/Avatar.svelte';
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
	<section class="card-hero" aria-label="About {friend.name}">
		<Avatar
			person={{
				displayName: friend.name,
				initials: friend.initials,
				accentColour: friend.colour,
				avatarUrl: friend.avatarUrl
			}}
			size={88}
			ring
		/>
		<div class="who">
			{#if friend.homeName}
				<p class="sub home"><Icon name="home" size={14} /> {friend.homeName}</p>
			{/if}
			<p class="sub">Friends since {since}</p>
		</div>
	</section>

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

	.card-hero {
		display: flex;
		align-items: center;
		gap: var(--space-m);
		padding: 4px;
	}

	.who {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.sub {
		color: var(--colour-text-muted);
	}

	.home {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.note {
		margin-top: var(--space-s);
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
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
</style>
