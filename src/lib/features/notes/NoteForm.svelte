<script lang="ts">
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	/** Title, text and the Hide until tapped option, for adding or editing a home note. */
	import { enhance } from '$app/forms';
	import { save } from '#lib/ui/save.svelte.js';
	import type { FieldErrors } from '#lib/types.js';

	interface Props {
		action: string;
		values: { title: string; body: string; isSecret: boolean };
		errors?: FieldErrors<'title' | 'body'>;
		submitLabel: string;
		/** Example text to show instead of the usual rotating ones (a contact: "Plumber"). */
		examples?: { title: string[]; body: string[] };
	}

	let { action, values, errors = {}, submitLabel, examples }: Props = $props();
	const titleExamples = $derived(examples?.title ?? PLACEHOLDERS.noteTitle);
	const bodyExamples = $derived(examples?.body ?? PLACEHOLDERS.noteBody);
	const saving = save();
</script>

<form novalidate method="POST" {action} class="form-stack" use:enhance={saving.enhance}>
	<label class="field">
		<span class="field-label">Call it</span>
		<input
			class="field-input"
			name="title"
			value={values.title}
			maxlength="60"
			placeholder={titleExamples[0]}
			use:placeholderReel={titleExamples}
			required
			aria-invalid={errors.title ? 'true' : undefined}
		/>
		{#if errors.title}<span class="field-error">{errors.title}</span>{/if}
	</label>

	<label class="field">
		<span class="field-label">The details</span>
		<textarea
			class="field-input"
			name="body"
			rows="5"
			maxlength="2000"
			placeholder={bodyExamples[0]}
			use:placeholderReel={bodyExamples}
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
		<button class="button-primary" disabled={saving.busy}
			>{saving.busy ? 'Saving…' : submitLabel}</button
		>
	</div>
</form>

<style>
	.secret {
		align-self: flex-start;
	}
</style>
