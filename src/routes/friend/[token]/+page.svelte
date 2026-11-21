<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/ui/Avatar.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let adding = $state(false);

	const link = $derived(data.link);
	const usable = $derived(Boolean(link?.usable || link?.alreadyFriends));
	const title = $derived.by(() => {
		if (!link || !usable) return 'This friend link has run out';
		if (link.isYou) return 'This is your friend link';
		if (link.alreadyFriends) return `You and ${link.name} are friends`;
		return `Be friends with ${link.name}?`;
	});
	const lead = $derived.by(() => {
		if (!link || !usable)
			return 'Friend links work once and last two weeks. Ask whoever sent it for a new one.';
		if (link.isYou) return 'Send it to a friend. Whoever opens it first becomes your friend.';
		if (link.alreadyFriends) return 'Nothing more to do.';
		return `Friends see each other’s name, photo and home’s name, and can send postcards to each other’s home feed. Nothing else is shared.`;
	});
	const canAccept = $derived(
		Boolean(link?.usable && !link.isYou && !link.alreadyFriends) &&
			(data.stage === 'ready' || data.stage === 'home')
	);
</script>

<svelte:head>
	<title>Friend link · home base</title>
</svelte:head>

<SoloScreen {title} {lead}>
	{#if link && usable && !link.isYou}
		<div class="sender">
			<Avatar
				person={{
					displayName: link.name,
					initials: link.initials,
					accentColour: link.colour,
					avatarUrl: null
				}}
				size={72}
				ring
			/>
		</div>
	{/if}

	<GlassCard padding="var(--space-m)">
		<div class="actions">
			{#if canAccept}
				<form
					method="POST"
					action="?/accept"
					use:enhance={() => {
						adding = true;
						return async ({ update }) => {
							await update();
							adding = false;
						};
					}}
				>
					<button class="button-primary button-block" disabled={adding}>
						{adding ? 'Adding…' : `Add ${link!.name} as a friend`}
					</button>
				</form>
				{#if form?.message}<p class="form-message" role="alert">{form.message}</p>{/if}
			{:else if link?.usable && !link.isYou && data.stage === 'signed-out'}
				<a class="button-primary button-block" href="/login">Sign in to add {link.name}</a>
				<a class="button-secondary button-block" href="/signup">Create an account</a>
			{:else if link?.usable && !link.isYou && data.stage === 'profile'}
				<a class="button-primary button-block" href="/setup/profile">Finish your profile first</a>
			{:else}
				<a class="button-primary button-block" href={data.stage === 'ready' ? '/profile' : '/'}>
					{data.stage === 'ready' ? 'Go to your friends' : 'Go to home base'}
				</a>
			{/if}
		</div>
	</GlassCard>

	{#snippet footer()}
		{#if link?.usable && !link.isYou && data.stage === 'signed-out'}
			<p class="note">Once you’re signed in, open this link again.</p>
		{/if}
	{/snippet}
</SoloScreen>

<style>
	.sender {
		display: flex;
		justify-content: center;
		margin-bottom: var(--space-m);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
	}

	.note {
		color: var(--colour-text-muted);
		font-size: var(--text-small);
		text-align: center;
	}
</style>
