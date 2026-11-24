<script lang="ts">
	/**
	 * Edit profile: everything other people see, in one place. Your photo, nickname and colour
	 * (your home and friends), then your public profile (anyone signed in, friends or not): the
	 * line about you and five short answers. One Save at the bottom saves it all.
	 */
	import ProfileForm from '#lib/features/account/ProfileForm.svelte';
	import {
		BIO_MAX,
		PUBLIC_FIELD_MAX,
		PUBLIC_FIELDS
	} from '#lib/features/friends/public-profile.js';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let saving = $state(false);
	const publicValues = $derived(form?.publicValues ?? data.publicProfile);

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
	<title>Edit profile · home base</title>
</svelte:head>

<PageHeader title="Edit profile">
	{#snippet lead()}
		<a class="button-quiet" href="/profile"><Icon name="back" size={18} /> You &amp; friends</a>
	{/snippet}
</PageHeader>

<ProfileForm
	id="profile-form"
	part="profile"
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

<!-- Part of the same form (form="profile-form"), so one Save covers both. -->
<section class="public" aria-labelledby="public-heading">
	<h2 id="public-heading" class="group-title">Public profile</h2>
	<p class="group-note top">
		Anyone on home base can see these, friends or not, like someone opening your friend link or a
		guest on a plan you share. All optional. Your photo only shows to your home and friends.
	</p>
	<div class="form-stack">
		<label class="field">
			<span class="field-label">About you</span>
			<textarea
				class="field-input bio"
				name="bio"
				form="profile-form"
				rows="2"
				maxlength={BIO_MAX}
				placeholder="Plant dad. Makes a mean lasagne.">{publicValues.bio}</textarea
			>
		</label>
		{#each PUBLIC_FIELDS as field (field.key)}
			<label class="field">
				<span class="field-label">{field.label}</span>
				<input
					class="field-input"
					name={field.key}
					form="profile-form"
					maxlength={PUBLIC_FIELD_MAX}
					placeholder={field.placeholder}
					value={publicValues.fields[field.key]}
				/>
			</label>
		{/each}
		{#if form?.problem}<p class="field-error" role="alert">{form.problem}</p>{/if}
	</div>
</section>

<div class="form-actions save">
	<button class="button-primary" form="profile-form" disabled={saving}
		>{saving ? 'Saving…' : 'Save'}</button
	>
</div>

<style>
	.public {
		margin-top: var(--space-2xl);
	}

	.top {
		margin: 0 4px var(--space-m);
	}

	.bio {
		resize: none;
		field-sizing: content;
		min-height: 64px;
	}

	.save {
		margin-top: var(--space-2xl);
	}
</style>
