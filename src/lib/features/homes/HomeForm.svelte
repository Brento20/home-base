<script lang="ts">
	/** Home name and password, shared by Build a home and Join a home. */
	import { enhance } from '$app/forms';
	import PasswordField from '#lib/ui/PasswordField.svelte';
	import type { FieldErrors } from '#lib/types.js';

	interface Props {
		mode: 'build' | 'join';
		name?: string;
		errors?: FieldErrors<'name' | 'password'>;
		message?: string | null;
	}

	let { mode, name = '', errors = {}, message = null }: Props = $props();
	let submitting = $state(false);
	const building = $derived(mode === 'build');
</script>

<form
	method="POST"
	class="form-stack"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	<label class="field">
		<span class="field-label">Home name</span>
		<input
			class="field-input"
			name="name"
			value={name}
			minlength="3"
			maxlength="30"
			autocomplete="off"
			placeholder={building ? 'Something everyone will recognise' : ''}
			required
			aria-invalid={errors.name ? 'true' : undefined}
		/>
		{#if errors.name}<span class="field-error">{errors.name}</span>{/if}
	</label>

	<PasswordField
		label="Home password"
		autocomplete={building ? 'new-password' : 'off'}
		minlength={building ? 8 : undefined}
		error={errors.password}
		hint={building
			? 'At least 8 characters. Not your account password: you’ll share this one.'
			: undefined}
	/>

	{#if message}<p class="form-message" role="alert">{message}</p>{/if}

	<button class="button-primary" disabled={submitting}>
		{#if building}{submitting ? 'Building…' : 'Build home'}
		{:else}{submitting ? 'Joining…' : 'Join home'}{/if}
	</button>
</form>
