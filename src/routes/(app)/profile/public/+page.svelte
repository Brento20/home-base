<script lang="ts">
	/**
	 * Editing your public profile: the line about you and five short answers, all optional.
	 * Anyone signed in can see them, friends or not; your photo stays with your home and friends.
	 */
	import { enhance } from '$app/forms';
	import {
		BIO_MAX,
		PUBLIC_FIELD_MAX,
		PUBLIC_FIELDS
	} from '#lib/features/friends/public-profile.js';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const values = $derived(form?.values ?? data.values);
	let saving = $state(false);
</script>

<svelte:head>
	<title>Public profile · home base</title>
</svelte:head>

<PageHeader title="Public profile">
	{#snippet lead()}
		<a class="button-quiet" href="/profile"><Icon name="back" size={18} /> You</a>
	{/snippet}
</PageHeader>

<p class="explain">
	People who aren’t your friends yet can see these, like someone opening your friend link or a guest
	on a plan you share, along with your name, pronouns and your home’s name. Fill in as much or as
	little as you like. Your photo only shows to your home and your friends.
</p>

<form
	method="POST"
	class="form-stack"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<label class="field">
		<span class="field-label">About you</span>
		<textarea
			class="field-input bio"
			name="bio"
			rows="2"
			maxlength={BIO_MAX}
			placeholder="Plant dad. Makes a mean lasagne.">{values.bio}</textarea
		>
	</label>

	{#each PUBLIC_FIELDS as field (field.key)}
		<label class="field">
			<span class="field-label">{field.label}</span>
			<input
				class="field-input"
				name={field.key}
				maxlength={PUBLIC_FIELD_MAX}
				placeholder={field.placeholder}
				value={values.fields[field.key]}
			/>
		</label>
	{/each}

	{#if form?.problem}<p class="field-error" role="alert">{form.problem}</p>{/if}

	<button class="button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
</form>

<style>
	.explain {
		margin-bottom: var(--space-l);
		color: var(--colour-text-muted);
	}

	.bio {
		resize: none;
		field-sizing: content;
		min-height: 64px;
	}
</style>
