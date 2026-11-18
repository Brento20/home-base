<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import ProfileForm from '#lib/features/account/ProfileForm.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.editProfile);
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
	account={data.account}
	values={form?.values}
	errors={form?.errors}
	submitLabel="Save"
	today={data.today}
/>

<a class="password" href="/account/password">Change your password</a>

<style>
	.password {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		margin-top: var(--space-xl);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
		text-decoration: none;
	}
</style>
