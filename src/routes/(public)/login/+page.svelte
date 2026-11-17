<script lang="ts">
	import { enhance } from '$app/forms';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PasswordField from '#lib/ui/PasswordField.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Sign in · home base</title>
</svelte:head>

<SoloScreen title="Sign in">
	{#snippet top()}
		<a class="button-quiet" href="/welcome"><Icon name="back" size={18} /> Back</a>
	{/snippet}

	{#if data.sampleMode}
		<p class="aside">
			Supabase isn’t connected yet, so the app is running on sample data. Add the keys in
			<code>.env</code> to turn on sign-in.
		</p>
		<a class="button-primary" href="/">Open the app</a>
	{:else}
		{#if data.notice && !form}<p class="form-success" role="status">{data.notice}</p>{/if}
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
						autocomplete="username"
						value={form?.email ?? ''}
						required
					/>
				</label>
				<PasswordField label="Password" autocomplete="current-password" />
				{#if form?.message}<p class="form-message" role="alert">{form.message}</p>{/if}
				<button class="button-primary" disabled={submitting}>
					{submitting ? 'Signing in…' : 'Sign in'}
				</button>
				<a class="button-quiet forgot" href="/forgot">Forgot your password?</a>
			</form>
		</GlassCard>
	{/if}

	{#snippet footer()}
		New here? <a href="/signup">Sign up</a>
	{/snippet}
</SoloScreen>

<style>
	.aside {
		color: var(--colour-text-muted);
	}

	code {
		font-size: 0.9em;
		color: var(--colour-text);
	}

	.forgot {
		align-self: center;
		margin-top: calc(var(--space-s) * -1);
	}
</style>
