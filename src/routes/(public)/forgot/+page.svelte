<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import { enhance } from '$app/forms';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const sentHeading = pick(HEADINGS.checkEmail);
	const heading = pick(HEADINGS.forgotPassword);
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Reset password · home base</title>
</svelte:head>

{#if form?.sent}
	<SoloScreen
		title={sentHeading}
		lead="If there’s an account for {form.email}, a link to set a new password is on its way."
	>
		{#snippet footer()}<a href="/login">Back to sign in</a>{/snippet}
	</SoloScreen>
{:else}
	<SoloScreen title={heading} lead="We’ll email you a link to set a new one.">
		{#snippet top()}
			<a class="button-quiet" href="/login"><Icon name="back" size={18} /> Sign in</a>
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
					/>
				</label>
				{#if form?.message}<p class="form-message" role="alert">{form.message}</p>{/if}
				<button class="button-primary" disabled={submitting}>
					{submitting ? 'Sending…' : 'Send the link'}
				</button>
			</form>
		</GlassCard>
	</SoloScreen>
{/if}
