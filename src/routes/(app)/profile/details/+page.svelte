<script lang="ts">
	/**
	 * Details and account: the private part of you. Your names, pronouns and birthday (only you
	 * and your home see them), then your email and password.
	 */
	import ProfileForm from '#lib/features/account/ProfileForm.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let saving = $state(false);
</script>

<svelte:head>
	<title>Details and account · home base</title>
</svelte:head>

<PageHeader title="Details and account">
	{#snippet lead()}
		<a class="button-quiet" href="/profile"><Icon name="back" size={18} /> You &amp; friends</a>
	{/snippet}
</PageHeader>

<ProfileForm
	id="details-form"
	part="details"
	account={data.account}
	values={form?.values}
	errors={form?.errors}
	submitLabel="Save"
	today={data.today}
	showActions={false}
	showEmail={false}
	bind:saving
/>

<section class="account" aria-labelledby="account-heading">
	<h2 id="account-heading" class="group-title">Account</h2>
	<ul class="grouped">
		<li class="grouped-row">
			<span class="grouped-label">Email</span>
			<span class="grouped-value">{data.account.email}</span>
		</li>
		<li>
			<a class="grouped-row" href="/account/password?from=profile"
				><span class="grouped-label">Change password</span><span class="grouped-chevron"
					><Icon name="chevron" size={16} /></span
				></a
			>
		</li>
	</ul>
</section>

<div class="form-actions save">
	<button class="button-primary" form="details-form" disabled={saving}
		>{saving ? 'Saving…' : 'Save'}</button
	>
</div>

<style>
	.account {
		margin-top: var(--space-2xl);
	}

	.save {
		margin-top: var(--space-2xl);
	}
</style>
