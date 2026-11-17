<script lang="ts">
	/** Title, text and the Hide until tapped option, for adding or editing a home note. */
	import { enhance } from '$app/forms';
	import type { FieldErrors } from '#lib/types.js';

	interface Props {
		action: string;
		values: { title: string; body: string; isSecret: boolean };
		errors?: FieldErrors<'title' | 'body'>;
		submitLabel: string;
		cancelHref: string;
	}

	let { action, values, errors = {}, submitLabel, cancelHref }: Props = $props();
	let saving = $state(false);
</script>

<form
	method="POST"
	{action}
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
		<span class="field-label">Title</span>
		<input
			class="field-input"
			name="title"
			value={values.title}
			maxlength="60"
			placeholder="Wifi"
			required
			aria-invalid={errors.title ? 'true' : undefined}
		/>
		{#if errors.title}<span class="field-error">{errors.title}</span>{/if}
	</label>

	<label class="field">
		<span class="field-label">Note</span>
		<textarea
			class="field-input"
			name="body"
			rows="5"
			maxlength="2000"
			placeholder="Network name and password"
			aria-invalid={errors.body ? 'true' : undefined}>{values.body}</textarea
		>
		{#if errors.body}<span class="field-error">{errors.body}</span>{/if}
	</label>

	<div class="field">
		<label class="choice-pill secret">
			<input type="checkbox" name="isSecret" checked={values.isSecret} />
			Hide until tapped
		</label>
		<span class="field-hint">
			Hidden on screen only. Everyone in your home can still read it, so keep bank logins out.
		</span>
	</div>

	<div class="form-actions">
		<a class="button-quiet" href={cancelHref}>Cancel</a>
		<button class="button-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
	</div>
</form>

<style>
	.secret {
		align-self: flex-start;
	}
</style>
