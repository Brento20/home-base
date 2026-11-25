<script lang="ts">
	/**
	 * The profile form: all of it while signing up, and in two halves afterwards. `part`
	 * "profile" is what others see (photo, nickname, colour: You & friends › Edit profile);
	 * "details" is what's private (names, pronouns, birthday: Details and account). The page
	 * saving a half fills in the other from what's saved (`withSavedDetails`).
	 * The chosen photo is shrunk in the browser before it's sent.
	 */
	import { enhance } from '$app/forms';
	import Avatar from '#lib/ui/Avatar.svelte';
	import { resizePhoto } from '#lib/ui/photo.js';
	import Icon from '#lib/ui/Icon.svelte';
	import { AVATAR_COLOURS } from './colours.js';
	import type { AccountDetails, FieldErrors, ProfileField, ProfileValues } from '#lib/types.js';

	interface Props {
		account: AccountDetails;
		/** What the person typed last time, when the form came back with errors. */
		values?: ProfileValues;
		errors?: FieldErrors<ProfileField>;
		submitLabel: string;
		today: string;
		/** For a Save button elsewhere on the page (`form="…"`). */
		id?: string;
		/** False when the page puts its own Save button at the bottom (bind `saving` to it). */
		showActions?: boolean;
		/** The "Signed up as" line; the edit page shows it under Account instead. */
		showEmail?: boolean;
		saving?: boolean;
		/**
		 * Shows "Your colour", with each housemate's name under the colour they wear
		 * (colour → nickname). Off while signing up: a colour is given on joining a home.
		 */
		housemateColours?: Record<string, string> | null;
		/** Which fields: everything (signing up), what others see, or the private ones. */
		part?: 'all' | 'profile' | 'details';
	}

	let {
		account,
		values,
		errors = {},
		submitLabel,
		today,
		id,
		showActions = true,
		showEmail = true,
		saving = $bindable(false),
		housemateColours = null,
		part = 'all'
	}: Props = $props();

	const showProfile = $derived(part !== 'details');
	const showDetails = $derived(part !== 'profile');

	const start = $derived(values ?? account);
	let photo = $state<File | null>(null);
	let preview = $state<string | null>(null);
	let removePhoto = $state(false);
	let photoProblem = $state<string | null>(null);
	// Follows the form's starting value, and the field can change it (for the preview initial).
	let nickname = $derived(start.nickname);
	// Follows the saved colour, and the picker changes it (for the preview).
	let colour = $derived(start.accentColour ?? account.accentColour);
	let fileInput = $state<HTMLInputElement>();

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
	{id}
	novalidate
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
	{#if showProfile}
		<div class="photo">
			<Avatar
				person={{
					displayName: nickname,
					initials: initial,
					accentColour: housemateColours ? colour : 'var(--colour-accent)',
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
	{/if}

	{#if showDetails}
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
	{/if}

	{#if showProfile}
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
			{:else}<span class="field-hint"
					>{part === 'profile'
						? 'The name everyone sees: your home, your friends and people on a plan with you.'
						: 'What everyone in your home sees.'}</span
				>{/if}
		</label>

		{#if housemateColours}
			<fieldset class="field colours">
				<legend class="field-label">Your colour</legend>
				<div class="swatches">
					{#each AVATAR_COLOURS as option (option.hex)}
						{@const wornBy = housemateColours[option.hex]}
						<label class="swatch" class:on={colour === option.hex}>
							<input
								class="hidden-input"
								type="radio"
								name="accentColour"
								value={option.hex}
								checked={colour === option.hex}
								onchange={() => (colour = option.hex)}
								aria-label="{option.name}{wornBy ? `, ${wornBy}'s colour` : ''}"
							/>
							<span class="swatch-colour" style:--swatch={option.hex}
								>{#if colour === option.hex}<Icon name="check" size={16} />{/if}</span
							>
							<span class="swatch-name">{wornBy ?? option.name}</span>
						</label>
					{/each}
				</div>
				{#if errors.accentColour}<span class="field-error">{errors.accentColour}</span>
				{:else}<span class="field-hint"
						>Your avatar, your rings on tasks and lists, and your score. Under a colour is who
						already wears it.</span
					>{/if}
			</fieldset>
		{/if}
	{/if}

	{#if showDetails}
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
		{#if part === 'details'}
			<p class="field-hint private">Only you and your home see these.</p>
		{/if}
	{/if}

	{#if showEmail}<p class="email">Signed up as {account.email}</p>{/if}

	{#if showActions}
		<div class="form-actions">
			<button class="button-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
		</div>
	{/if}
</form>

<style>
	/* The photo centred at the top, its actions underneath, as on an iPhone contact card. */
	.photo {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-s);
		margin-bottom: var(--space-s);
	}

	.photo .field-error {
		text-align: center;
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

	/* Your colour: five across, so ten fit any phone in two rows. */
	.colours {
		margin: 0;
		padding: 0;
		border: 0;
	}

	.swatches {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 12px 4px;
		margin-top: 4px;
	}

	.swatch {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}

	.swatch-colour {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--swatch);
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
		color: var(--colour-on-ring);
	}

	.swatch.on .swatch-colour {
		box-shadow:
			0 0 0 2px var(--colour-ground),
			0 0 0 4px var(--swatch);
	}

	.swatch:has(input:focus-visible) .swatch-colour {
		outline: 2px solid var(--colour-accent);
		outline-offset: 5px;
	}

	.swatch-name {
		max-width: 100%;
		overflow: hidden;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.swatch.on .swatch-name {
		color: var(--colour-text);
		font-weight: var(--weight-medium);
	}

	.email {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}
</style>
