<script lang="ts">
	import { enhance } from '$app/forms';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let joining = $state(false);

	const invite = $derived(data.invite?.usable ? data.invite : null);
	const lead = $derived.by(() => {
		if (!invite)
			return 'Invite links last a week and let in as many people as they were made for. Ask whoever sent it for a new one.';
		const who = invite.invitedBy ?? 'Someone';
		if (data.stage === 'ready')
			return `${who} invited you, but you’re already in a home. Each account belongs to one home.`;
		return `${who} invited you to share plans, chores and lists in home base.`;
	});
</script>

<svelte:head>
	<title>{invite ? `Join ${invite.homeName}` : 'Invite link'} · home base</title>
</svelte:head>

<SoloScreen title={invite ? `Join ${invite.homeName}` : 'This invite has run out'} {lead}>
	<GlassCard padding="var(--space-m)">
		<div class="actions">
			{#if !invite || data.stage === 'ready'}
				<a class="button-primary button-block" href="/">
					{data.stage === 'signed-out' ? 'Go to home base' : 'Back to your home'}
				</a>
			{:else if data.stage === 'signed-out'}
				<a class="button-primary button-block" href="/signup">Create an account</a>
				<a class="button-secondary button-block" href="/login">I already have one</a>
			{:else if data.stage === 'profile'}
				<a class="button-primary button-block" href="/setup/profile">Set up your profile</a>
			{:else}
				<form
					method="POST"
					action="?/accept"
					use:enhance={() => {
						joining = true;
						return async ({ update }) => {
							await update();
							joining = false;
						};
					}}
				>
					<button class="button-primary button-block" disabled={joining}>
						{joining ? 'Joining…' : `Join ${invite.homeName}`}
					</button>
				</form>
				{#if form?.message}<p class="form-message" role="alert">{form.message}</p>{/if}
			{/if}
		</div>
	</GlassCard>

	{#snippet footer()}
		{#if invite && data.stage === 'signed-out'}
			<p class="note">After you sign up you’ll come straight back here.</p>
		{:else if invite && data.stage === 'profile'}
			<p class="note">You’ll join once your profile’s done.</p>
		{:else if invite && data.stage === 'home'}
			<form method="POST" action="?/decline">
				<button class="button-quiet">Build my own home instead</button>
			</form>
		{/if}
	{/snippet}
</SoloScreen>

<style>
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

	form:has(.button-quiet) {
		display: flex;
		justify-content: center;
	}
</style>
