<script lang="ts">
	import { enhance } from '$app/forms';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import PasswordField from '#lib/ui/PasswordField.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>New password · home base</title>
</svelte:head>

<SoloScreen title="Set a new password">
	<GlassCard>
		<form
			method="POST"
			class="form-stack"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<PasswordField
				label="New password"
				autocomplete="new-password"
				minlength={10}
				error={form?.message}
				hint="At least 10 characters."
			/>
			<button class="button-primary" disabled={submitting}>
				{submitting ? 'Saving…' : 'Save password'}
			</button>
		</form>
	</GlassCard>
</SoloScreen>
