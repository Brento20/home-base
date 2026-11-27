<script lang="ts">
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	/** Naming a new home (Build a home). People join by invite link, not by name. */
	import { enhance } from '$app/forms';
	import { save } from '#lib/ui/save.svelte.js';
	import type { FieldErrors } from '#lib/types.js';

	interface Props {
		name?: string;
		errors?: FieldErrors<'name'>;
		message?: string | null;
	}

	let { name = '', errors = {}, message = null }: Props = $props();
	const submitting = save();
</script>

<form novalidate method="POST" class="form-stack" use:enhance={submitting.enhance}>
	<label class="field">
		<span class="field-label">Home name</span>
		<input
			class="field-input"
			name="name"
			value={name}
			minlength="3"
			maxlength="30"
			autocomplete="off"
			placeholder={PLACEHOLDERS.homeName[0]}
			use:placeholderReel={PLACEHOLDERS.homeName}
			required
			aria-invalid={errors.name ? 'true' : undefined}
		/>
		{#if errors.name}<span class="field-error">{errors.name}</span>{/if}
	</label>

	{#if message}<p class="form-message" role="alert">{message}</p>{/if}

	<button class="button-primary" disabled={submitting.busy}>
		{submitting.busy ? 'Building…' : 'Build home'}
	</button>
</form>
