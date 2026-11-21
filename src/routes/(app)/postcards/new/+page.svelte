<script lang="ts">
	/**
	 * Sending a postcard: pick a friend, add a photo, a few lines or both, and it lands in their
	 * home's feed. The same composer as a feed post (PostComposer), with a "To" field. Only
	 * friends in a home are listed (there's no feed otherwise).
	 */
	import { untrack } from 'svelte';
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import PostComposer from '#lib/features/feed/PostComposer.svelte';
	import { POSTCARD_MAX } from '#lib/features/friends/friends.js';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Starts from what was sent if it bounced back with a problem.
	let to = $state(untrack(() => form?.to ?? data.to ?? data.friends[0]?.id ?? ''));
	const friend = $derived(data.friends.find((each) => each.id === to));
	const back = $derived(data.to ? `/profile/${data.to}` : '/profile');
</script>

<svelte:head>
	<title>Send a postcard · home base</title>
</svelte:head>

<PageHeader title="Send a postcard">
	{#snippet lead()}
		<a class="button-quiet" href={back}><Icon name="back" size={18} /> Back</a>
	{/snippet}
</PageHeader>

{#if data.friends.length === 0}
	<p class="explain">
		Postcards go to friends in other homes. Add a friend from <a href="/profile">your profile</a>
		first.
	</p>
{:else}
	<PostComposer
		errors={form?.errors}
		body={form?.body}
		maxLength={POSTCARD_MAX}
		placeholders={PLACEHOLDERS.postcard}
		submitLabel="Send"
		busyLabel="Sending…"
	>
		{#snippet fields()}
			<label class="field">
				<span class="field-label">To</span>
				<select class="field-input" name="to" bind:value={to}>
					{#each data.friends as each (each.id)}
						<option value={each.id}>{each.name} · {each.homeName}</option>
					{/each}
				</select>
			</label>
		{/snippet}
		{#snippet footer()}
			{#if form?.message}<p class="field-error" role="alert">{form.message}</p>{/if}
			<p class="field-hint">
				Everyone at {friend?.homeName ?? 'their home'} will see it on their feed, with your name and your
				home’s name.
			</p>
		{/snippet}
	</PostComposer>
{/if}

<style>
	.explain {
		color: var(--colour-text-muted);
	}
</style>
