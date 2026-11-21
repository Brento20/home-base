<script lang="ts">
	/**
	 * One postcard, whole. Anyone in the home can take it down (for everyone here) or block the
	 * person who sent it, which takes down all their postcards and stops new ones.
	 */
	import PostcardCard from '#lib/features/friends/PostcardCard.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const card = $derived(data.postcard);
	const from = $derived(card.postcard!);
</script>

<svelte:head>
	<title>Postcard from {from.name} · home base</title>
</svelte:head>

<PageHeader title="Postcard">
	{#snippet lead()}
		<a class="button-quiet" href="/"><Icon name="back" size={18} /> Today</a>
	{/snippet}
</PageHeader>

<PostcardCard post={{ ...card, postcard: from }} full />

<p class="note">Postcards come from friends of people in your home. Everyone here sees them.</p>
{#if form?.message}<p class="field-error" role="alert">{form.message}</p>{/if}

<ConfirmDelete action="?/remove" label="Take it down" confirmLabel="Tap again to take it down" />
{#if from.profileId}
	<ConfirmDelete action="?/block" label="Block {from.name}" confirmLabel="Tap again to block" />
{/if}

<style>
	.note {
		margin-top: var(--space-m);
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}
</style>
