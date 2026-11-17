<script lang="ts">
	/**
	 * The profile form, used during sign-up and from Home › Edit your profile.
	 * The chosen photo is shrunk in the browser before it's sent.
	 */
	import { enhance } from '$app/forms';
	import Avatar from '#lib/ui/Avatar.svelte';
	import { resizePhoto } from './resize-photo.js';
	import type { AccountDetails, FieldErrors, ProfileField, ProfileValues } from '#lib/types.js';

	interface Props {
		account: AccountDetails;
		/** What the person typed last time, when the form came back with errors. */
		values?: ProfileValues;
		errors?: FieldErrors<ProfileField>;
		submitLabel: string;
		cancelHref?: string;
		today: string;
	}

	let { account, values, errors = {}, submitLabel, cancelHref, today }: Props = $props();

	const start = $derived(values ?? account);

	let saving = $state(false);
	let photo = $state<File | null>(null);
	let preview = $state<string | null>(null);
	let removePhoto = $state(false);
	let photoProblem = $state<string | null>(null);
	let nickname = $state('');
	let fileInput = $state<HTMLInputElement>();

	$effect.pre(() => {
		nickname = start.nickname;
	});

	const shownAvatar = $derived(removePhoto ? null : (preview ?? account.avatarUrl));
	const initial = $derived((Array.from(nickname.trim())[0] ?? '?').toUpperCase());

	async function choose(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		photoProblem = null;
		try {
			photo = await resizePhoto(file);
			if (preview) URL.revokeObjectURL(preview);
			preview = URL.createObjectURL(photo);
			removePhoto = false;
		} catch {
			photoProblem = 'That photo couldn’t be read. Try a different one.';
		}
	}

	function clearPhoto() {
		photo = null;
		if (preview) URL.revokeObjectURL(preview);
		preview = null;
		removePhoto = Boolean(account.avatarUrl);
		if (fileInput) fileInput.value = '';
	}
</script>

<form
	method="POST"
	enctype="multipart/form-data"
	class="form-stack"
	use:enhance={({ formData }) => {
		saving = true;
		// Send the shrunk copy, never the original from the camera roll.
		formData.delete('photo');
		if (photo) formData.set('photo', photo);
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<div class="photo">
		<Avatar
			person={{
				displayName: nickname,
				initials: initial,
				accentColour: 'var(--colour-accent)',
				avatarUrl: shownAvatar
			}}
			size={88}
		/>
		<div class="photo-actions">
			<label class="button-secondary photo-pick">
				{shownAvatar ? 'Change photo' : 'Add a photo'}
				<input
					bind:this={fileInput}
					type="file"
					name="photo"
					accept="image/jpeg,image/png,image/webp,image/heic"
					onchange={choose}
				/>
			</label>
			{#if shownAvatar}
				<button type="button" class="button-quiet" onclick={clearPhoto}>Remove</button>
			{/if}
		</div>
		{#if removePhoto}<input type="hidden" name="removePhoto" value="on" />{/if}
		{#if photoProblem ?? errors.photo}
			<span class="field-error">{photoProblem ?? errors.photo}</span>
		{/if}
	</div>

	<div class="field-row">
		<label class="field">
			<span class="field-label">First name</span>
			<input
				class="field-input"
				name="firstName"
				autocomplete="given-name"
				value={start.firstName}
				maxlength="40"
				required
				aria-invalid={errors.firstName ? 'true' : undefined}
			/>
			{#if errors.firstName}<span class="field-error">{errors.firstName}</span>{/if}
		</label>
		<label class="field">
			<span class="field-label">Last name</span>
			<input
				class="field-input"
				name="lastName"
				autocomplete="family-name"
				value={start.lastName}
				maxlength="40"
				required
				aria-invalid={errors.lastName ? 'true' : undefined}
			/>
			{#if errors.lastName}<span class="field-error">{errors.lastName}</span>{/if}
		</label>
	</div>

	<label class="field">
		<span class="field-label">Nickname</span>
		<input
			class="field-input"
			name="nickname"
			autocomplete="nickname"
			bind:value={nickname}
			maxlength="24"
			required
			aria-invalid={errors.nickname ? 'true' : undefined}
		/>
		{#if errors.nickname}<span class="field-error">{errors.nickname}</span>
		{:else}<span class="field-hint">What everyone in your home sees.</span>{/if}
	</label>

	<div class="field-row">
		<label class="field">
			<span class="field-label">Pronouns</span>
			<input
				class="field-input"
				name="pronouns"
				list="pronoun-options"
				value={start.pronouns}
				maxlength="24"
				placeholder="Optional"
				autocapitalize="off"
				aria-invalid={errors.pronouns ? 'true' : undefined}
			/>
			<datalist id="pronoun-options">
				<option value="she/her"></option>
				<option value="he/him"></option>
				<option value="they/them"></option>
			</datalist>
			{#if errors.pronouns}<span class="field-error">{errors.pronouns}</span>{/if}
		</label>
		<label class="field">
			<span class="field-label">Date of birth</span>
			<input
				class="field-input"
				name="dateOfBirth"
				type="date"
				autocomplete="bday"
				value={start.dateOfBirth}
				min="1900-01-01"
				max={today}
				required
				aria-invalid={errors.dateOfBirth ? 'true' : undefined}
			/>
			{#if errors.dateOfBirth}<span class="field-error">{errors.dateOfBirth}</span>{/if}
		</label>
	</div>

	<p class="email">Signed up as {account.email}</p>

	<div class="form-actions">
		{#if cancelHref}<a class="button-quiet" href={cancelHref}>Cancel</a>{:else}<span></span>{/if}
		<button class="button-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
	</div>
</form>

<style>
	.photo {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-m);
	}

	.photo .field-error {
		flex-basis: 100%;
	}

	.photo-actions {
		display: flex;
		align-items: center;
		gap: var(--space-s);
	}

	.photo-pick {
		position: relative;
		min-height: 44px;
		padding: 0 18px;
		font-size: var(--text-small);
		cursor: pointer;
	}

	.photo-pick input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.photo-pick:has(input:focus-visible) {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}

	.email {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}
</style>
