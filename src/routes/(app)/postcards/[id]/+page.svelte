<script lang="ts">
	/**
	 * One postcard, whole, with its replies. For the home it went to: Send one back, take it down
	 * (for everyone here) or block whoever sent it. For the person who sent it: take it back.
	 * Both see the same reactions and replies.
	 */
	import Conversation from '#lib/features/feed/Conversation.svelte';
	import PostcardCard from '#lib/features/friends/PostcardCard.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const card = $derived(data.postcard);
	const from = $derived(card.postcard!);
	const back = $derived(data.mine && from.toProfileId ? `/profile/${from.toProfileId}` : '/');
</script>

<svelte:head>
	<title>{data.mine ? 'Your postcard' : `Postcard from ${from.name}`} · home base</title>
</svelte:head>

<PageHeader title="Postcard">
	{#snippet lead()}
		<a class="button-quiet" href={back}
			><Icon name="back" size={18} /> {data.mine && data.otherName ? data.otherName : 'Today'}</a
		>
	{/snippet}
</PageHeader>

<PostcardCard
	post={{ ...card, postcard: from }}
	people={data.household.members}
	me={data.me.id}
	toName={data.otherName}
	full
/>

{#if data.canSendBack}
	<a class="button-secondary button-block send-back" href="/postcards/new?to={from.profileId}">
		<Icon name="compose" size={18} /> Send one back
	</a>
{/if}

<Conversation
	replies={card.replies}
	people={data.household.members}
	me={data.me.id}
	replyMax={data.replyMax}
	problem={form?.replyProblem}
/>

<p class="note">
	{data.mine
		? `Only you and ${data.otherName ? `${data.otherName}’s home` : 'the home it went to'} see this postcard and its replies.`
		: 'Only your home and the person who sent it see this postcard and its replies.'}
</p>
{#if form?.message}<p class="field-error" role="alert">{form.message}</p>{/if}

{#if data.mine}
	<ConfirmDelete action="?/remove" label="Take it back" confirmLabel="Tap again to take it back" />
{:else}
	<ConfirmDelete action="?/remove" label="Take it down" confirmLabel="Tap again to take it down" />
	{#if from.profileId}
		<ConfirmDelete action="?/block" label="Block {from.name}" confirmLabel="Tap again to block" />
	{/if}
{/if}

<style>
	.send-back {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: var(--space-m);
	}

	.note {
		margin-top: var(--space-m);
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}
</style>
