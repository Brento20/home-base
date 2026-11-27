<script lang="ts">
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import { enhance } from '$app/forms';
	import { save } from '#lib/ui/save.svelte.js';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.newGroup);
	const saving = save();

	const others = $derived(data.household.members.filter((person) => person.id !== data.me.id));
	// Everyone else in the home is ticked to start with; most groups are the whole home.
	const ticked = $derived(form?.memberIds ?? others.map((person) => person.id));
</script>

<svelte:head>
	<title>New group · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/money"><Icon name="back" size={18} /> Money</a>
	{/snippet}
</PageHeader>

<form method="POST" class="form-stack" use:enhance={saving.enhance}>
	<label class="field">
		<span class="field-label">Group name</span>
		<input
			class="field-input"
			name="name"
			value={form?.name ?? ''}
			maxlength="40"
			placeholder={PLACEHOLDERS.groupName[0]}
			use:placeholderReel={PLACEHOLDERS.groupName}
			required
			aria-invalid={form?.errors?.name ? 'true' : undefined}
		/>
		{#if form?.errors?.name}<span class="field-error">{form.errors.name}</span>{/if}
	</label>

	<fieldset class="field">
		<legend class="field-label">Who’s in it</legend>
		{#if others.length === 0}
			<p class="field-hint">
				It’s just you for now. Once someone joins your home, add them from the group’s settings.
			</p>
		{:else}
			<div class="choice-pills">
				<span class="choice-pill you" aria-label="You, always in your own groups">
					<Avatar person={data.me} size={22} dot /> You
				</span>
				{#each others as person (person.id)}
					<label class="choice-pill">
						<input
							type="checkbox"
							name="members"
							value={person.id}
							checked={ticked.includes(person.id)}
						/>
						<Avatar {person} size={22} dot />
						{person.displayName}
					</label>
				{/each}
			</div>
		{/if}
	</fieldset>

	{#if form?.message}<p class="form-message" role="alert">{form.message}</p>{/if}

	<div class="form-actions">
		<button class="button-primary" disabled={saving.busy}
			>{saving.busy ? 'Making…' : 'Make group'}</button
		>
	</div>
</form>

<style>
	.you {
		border-color: var(--colour-accent-edge);
		background: var(--colour-accent-soft);
		color: var(--colour-text);
		cursor: default;
	}
</style>
