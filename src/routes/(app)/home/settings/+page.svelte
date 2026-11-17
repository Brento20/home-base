<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/ui/Avatar.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import PasswordField from '#lib/ui/PasswordField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state<'rename' | 'password' | null>(null);

	const submitting = (which: 'rename' | 'password') => () => {
		busy = which;
		return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: which === 'password' });
			busy = null;
		};
	};
</script>

<svelte:head>
	<title>Home settings · home base</title>
</svelte:head>

<PageHeader title="Home settings">
	{#snippet lead()}
		<a class="button-quiet" href="/home"><Icon name="back" size={18} /> Home</a>
	{/snippet}
</PageHeader>

<section aria-labelledby="people-heading">
	<h2 id="people-heading" class="section-label">Everyone here</h2>
	<ul class="people">
		{#each data.household.members as person (person.id)}
			<li>
				<Avatar {person} size={36} />
				<span class="name">{person.displayName}{person.id === data.me.id ? ' (you)' : ''}</span>
				{#if data.household.ownerIds.includes(person.id)}<span class="role">Owner</span>{/if}
			</li>
		{/each}
	</ul>
</section>

{#if data.isOwner}
	<section aria-labelledby="invite-heading">
		<h2 id="invite-heading" class="section-label">Inviting people</h2>
		<p class="explain">
			{#if data.hasPassword}
				Share the home name, <strong>{data.household.name}</strong>, and its password. They join
				from the welcome screen after signing up.
			{:else}
				Set a password so people can join. Until then nobody else can.
			{/if}
		</p>

		<div class="stack">
			<GlassCard>
				<form method="POST" action="?/rename" class="form-stack" use:enhance={submitting('rename')}>
					<label class="field">
						<span class="field-label">Home name</span>
						<input
							class="field-input"
							name="name"
							value={form?.rename?.name ?? data.household.name}
							minlength="3"
							maxlength="30"
							required
							aria-invalid={form?.rename?.message ? 'true' : undefined}
						/>
						{#if form?.rename?.message}<span class="field-error">{form.rename.message}</span>
						{:else if form?.rename && 'saved' in form.rename}<span class="field-hint">Saved.</span
							>{/if}
					</label>
					<button class="button-secondary" disabled={busy === 'rename'}>
						{busy === 'rename' ? 'Saving…' : 'Rename home'}
					</button>
				</form>
			</GlassCard>

			<GlassCard>
				<form
					method="POST"
					action="?/password"
					class="form-stack"
					use:enhance={submitting('password')}
				>
					<PasswordField
						label={data.hasPassword ? 'New home password' : 'Home password'}
						autocomplete="new-password"
						minlength={8}
						error={form?.password?.message ?? undefined}
						hint={form?.password && 'saved' in form.password
							? 'Saved. Share it with whoever you’re inviting.'
							: 'At least 8 characters. Changing it doesn’t remove anyone.'}
					/>
					<button class="button-secondary" disabled={busy === 'password'}>
						{busy === 'password' ? 'Saving…' : 'Save password'}
					</button>
				</form>
			</GlassCard>
		</div>
	</section>
{:else}
	<p class="explain">
		To invite someone, ask an owner for the home password, then share it with the home name,
		<strong>{data.household.name}</strong>.
	</p>
{/if}

<style>
	section + section,
	section + .explain {
		margin-top: var(--space-xl);
	}

	.section-label {
		margin-bottom: var(--space-m);
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	.people {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 0;
		list-style: none;
	}

	.people li {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.name {
		flex: 1;
	}

	.role {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.explain {
		max-width: 36ch;
		margin-bottom: var(--space-m);
		color: var(--colour-text-muted);
	}

	.explain strong {
		font-weight: var(--weight-medium);
		color: var(--colour-text);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
</style>
