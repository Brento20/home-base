<script lang="ts">
	/** A password input with a Show/Hide button. */
	import type { FullAutoFill } from 'svelte/elements';

	interface Props {
		label: string;
		name?: string;
		autocomplete: FullAutoFill;
		error?: string;
		hint?: string;
		minlength?: number;
	}

	let { label, name = 'password', autocomplete, error, hint, minlength }: Props = $props();
	let visible = $state(false);
</script>

<label class="field">
	<span class="field-label">{label}</span>
	<span class="password">
		<input
			class="field-input"
			{name}
			type={visible ? 'text' : 'password'}
			{autocomplete}
			{minlength}
			autocapitalize="off"
			spellcheck="false"
			required
			aria-invalid={error ? 'true' : undefined}
		/>
		<button
			type="button"
			class="reveal"
			onclick={() => (visible = !visible)}
			aria-pressed={visible}
			aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? 'Hide' : 'Show'}</button
		>
	</span>
	{#if error}<span class="field-error">{error}</span>
	{:else if hint}<span class="field-hint">{hint}</span>{/if}
</label>

<style>
	.password {
		position: relative;
		display: block;
	}

	.password .field-input {
		padding-right: 72px;
	}

	.reveal {
		position: absolute;
		top: 0;
		right: 4px;
		height: 100%;
		padding: 0 14px;
		border: 0;
		background: none;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}
</style>
