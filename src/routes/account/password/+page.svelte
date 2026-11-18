<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import { enhance } from '$app/forms';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import PasswordField from '#lib/ui/PasswordField.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.newPassword);
	let submitting = $state(false);
</script>

<svelte:head>
	<title>New password · home base</title>
</svelte:head>

<SoloScreen title={heading}>
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
