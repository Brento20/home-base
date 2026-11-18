<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import { enhance } from '$app/forms';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PasswordField from '#lib/ui/PasswordField.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { FieldErrors } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const sentHeading = pick(HEADINGS.checkEmail);
	const heading = pick(HEADINGS.signUp);
	let submitting = $state(false);
	const errors: FieldErrors<'email' | 'password'> = $derived(
		form && 'errors' in form ? (form.errors ?? {}) : {}
	);
</script>

<svelte:head>
	<title>Sign up · home base</title>
</svelte:head>

{#if form && 'sent' in form && form.sent}
	<SoloScreen
		title={sentHeading}
		lead="We sent a link to {form.email}. Open it on this phone to carry on."
	>
		<p class="aside">
			Nothing there after a minute? Check your junk folder, or <a href="/signup">try again</a>.
		</p>
	</SoloScreen>
{:else}
	<SoloScreen title={heading} lead="Start with your email and a password. Your profile comes next.">
		{#snippet top()}
			<a class="button-quiet" href="/welcome"><Icon name="back" size={18} /> Back</a>
		{/snippet}

		<GlassCard>
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
					<span class="field-label">Email</span>
					<input
						class="field-input"
						name="email"
						type="email"
						autocomplete="email"
						value={form?.email ?? ''}
						required
						aria-invalid={errors.email ? 'true' : undefined}
					/>
					{#if errors.email}<span class="field-error">{errors.email}</span>{/if}
				</label>

				<PasswordField
					label="Password"
					autocomplete="new-password"
					minlength={10}
					error={errors.password}
					hint="At least 10 characters."
				/>

				{#if form?.message}<p class="form-message" role="alert">{form.message}</p>{/if}

				<button class="button-primary" disabled={submitting}>
					{submitting ? 'Signing up…' : 'Sign up'}
				</button>
			</form>
		</GlassCard>

		{#snippet footer()}
			Already have an account? <a href="/login">Sign in</a>
		{/snippet}
	</SoloScreen>
{/if}

<style>
	.aside {
		color: var(--colour-text-muted);
	}

	.aside a {
		color: var(--colour-text);
	}
</style>
