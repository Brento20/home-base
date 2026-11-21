<script lang="ts">
	/**
	 * Edit your profile, laid out like an iPhone settings page: your photo and details, then
	 * Appearance (which saves as you tap), then Account, with Save for your details at the very
	 * bottom.
	 */
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import AppearanceSettings from '#lib/features/account/AppearanceSettings.svelte';
	import ProfileForm from '#lib/features/account/ProfileForm.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.editProfile);
	let saving = $state(false);

	// Who already wears which colour (not you), for "Your colour".
	const housemateColours = $derived(
		Object.fromEntries(
			data.household.members
				.filter((member) => member.id !== data.me.id)
				.map((member) => [member.accentColour.toLowerCase(), member.displayName])
		)
	);
</script>

<svelte:head>
	<title>Your profile · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/home"><Icon name="back" size={18} /> Home</a>
	{/snippet}
</PageHeader>

<ProfileForm
	id="profile-form"
	account={data.account}
	values={form?.values}
	errors={form?.errors}
	submitLabel="Save"
	today={data.today}
	showActions={false}
	showEmail={false}
	{housemateColours}
	bind:saving
/>

<AppearanceSettings />

<section class="account" aria-labelledby="account-heading">
	<h2 id="account-heading" class="section-label">Account</h2>
	<ul class="group">
		<li class="row static">
			<span class="row-name">Email</span>
			<span class="row-value">{data.account.email}</span>
		</li>
		<li>
			<a class="row" href="/account/password?from=profile">
				<span class="row-name">Change password</span>
				<Icon name="chevron" size={16} />
			</a>
		</li>
	</ul>
</section>

<!-- Saves your details above; Appearance has already saved itself. -->
<div class="form-actions save">
	<button class="button-primary" form="profile-form" disabled={saving}
		>{saving ? 'Saving…' : 'Save'}</button
	>
</div>

<style>
	.account {
		margin-top: var(--space-2xl);
	}

	.section-label {
		margin: 0 0 10px 4px;
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	/* The same grouped list as Appearance. */
	.group {
		margin: 0;
		padding: 0;
		border-radius: 18px;
		background: var(--glass-body);
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
		list-style: none;
		overflow: hidden;
	}

	.group li + li {
		box-shadow: inset 0 1px 0 var(--colour-hairline);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 52px;
		padding: 8px 14px 8px 16px;
		color: var(--colour-text);
		text-decoration: none;
	}

	a.row:active {
		background-color: var(--colour-press);
	}

	.row > :global(svg) {
		flex: none;
		color: var(--colour-text-faint);
	}

	.row-name {
		font-size: var(--text-body);
	}

	.row-value {
		min-width: 0;
		overflow: hidden;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.save {
		margin-top: var(--space-2xl);
	}
</style>
