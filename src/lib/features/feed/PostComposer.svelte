<script lang="ts">
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	/**
	 * Writing a feed post: a message, a photo, or both. The photo is shrunk in the browser before
	 * it's sent (and loses its location data on the way).
	 */
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Icon from '#lib/ui/Icon.svelte';
	import { shrinkPhoto } from '#lib/ui/photo.js';
	import type { FieldErrors } from '#lib/types.js';

	interface Props {
		errors?: FieldErrors<'body' | 'photo'>;
		body?: string;
		maxLength: number;
	}

	let { errors = {}, body: startBody = '', maxLength }: Props = $props();

	// Starts from what was sent if the post bounced back with an error.
	let body = $state(untrack(() => startBody));
	let photo = $state<File | null>(null);
	let preview = $state<string | null>(null);
	let photoProblem = $state<string | null>(null);
	let reading = $state(false);
	let saving = $state(false);
	let fileInput = $state<HTMLInputElement>();

	const empty = $derived(!body.trim() && !photo);
	const nearLimit = $derived(body.length > maxLength - 100);

	async function choose(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		photoProblem = null;
		reading = true;
		try {
			photo = await shrinkPhoto(file);
			if (preview) URL.revokeObjectURL(preview);
			preview = URL.createObjectURL(photo);
		} catch {
			photoProblem = 'That photo couldn’t be read. Try a different one.';
		} finally {
			reading = false;
		}
	}

	function removePhoto() {
		photo = null;
		if (preview) URL.revokeObjectURL(preview);
		preview = null;
		if (fileInput) fileInput.value = '';
	}
</script>

<form
	method="POST"
	enctype="multipart/form-data"
	class="composer"
	use:enhance={({ formData, cancel }) => {
		if (empty) return cancel();
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
	<label class="field">
		<span class="visually-hidden">Message</span>
		<textarea
			class="field-input message"
			name="body"
			rows="5"
			maxlength={maxLength}
			placeholder={PLACEHOLDERS.post[0]}
			use:placeholderReel={PLACEHOLDERS.post}
			bind:value={body}
			aria-invalid={errors.body ? 'true' : undefined}></textarea>
		{#if nearLimit}<span class="limit">{maxLength - body.length} left</span>{/if}
		{#if errors.body}<span class="field-error">{errors.body}</span>{/if}
	</label>

	{#if preview}
		<div class="preview">
			<img src={preview} alt="Chosen for this post" />
			<button type="button" class="remove" onclick={removePhoto} aria-label="Remove photo">
				<Icon name="close" size={18} />
			</button>
		</div>
	{/if}
	{#if photoProblem ?? errors.photo}
		<span class="field-error">{photoProblem ?? errors.photo}</span>
	{/if}

	<div class="actions">
		<label class="button-secondary add-photo">
			<Icon name="photo" size={20} />
			{reading ? 'Reading photo…' : preview ? 'Change photo' : 'Add photo'}
			<input
				bind:this={fileInput}
				type="file"
				name="photo"
				accept="image/jpeg,image/png,image/webp,image/heic"
				onchange={choose}
			/>
		</label>
		<button class="button-primary post" disabled={empty || saving || reading}>
			{saving ? 'Posting…' : 'Post'}
		</button>
	</div>
</form>

<style>
	.composer {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
	}

	.field {
		position: relative;
	}

	.message {
		min-height: 150px;
		font-size: var(--text-body);
		line-height: 1.45;
	}

	.limit {
		position: absolute;
		right: 14px;
		bottom: 10px;
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.preview {
		position: relative;
	}

	.preview img {
		display: block;
		width: 100%;
		max-height: 420px;
		object-fit: cover;
		border-radius: 18px;
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
	}

	.remove {
		position: absolute;
		top: 10px;
		right: 10px;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 0;
		border-radius: 50%;
		background: var(--surface-bar);
		color: var(--colour-text);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
	}

	.actions {
		display: flex;
		gap: 12px;
	}

	.add-photo {
		position: relative;
		display: inline-flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.add-photo input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.add-photo:has(input:focus-visible) {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}

	.post {
		flex: 1;
	}
</style>
