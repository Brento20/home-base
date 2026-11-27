<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import { enhance } from '$app/forms';
	import { save } from '#lib/ui/save.svelte.js';
	import { page } from '$app/state';
	import Icon from '#lib/ui/Icon.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import PasswordField from '#lib/ui/PasswordField.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.newPassword);
	const submitting = save({ reset: true });

	// From Edit your profile, back goes there; from a reset email, back to Today.
	const fromProfile = $derived(page.url.searchParams.get('from') === 'profile');
</script>

<svelte:head>
	<title>New password · home base</title>
</svelte:head>

<SoloScreen title={heading}>
	{#snippet top()}
		<a class="button-quiet back" href={fromProfile ? '/profile/details' : '/'}
			><Icon name="back" size={18} /> {fromProfile ? 'Details and account' : 'Today'}</a
		>
	{/snippet}
	<GlassCard>
		<form method="POST" class="form-stack" use:enhance={submitting.enhance}>
			<PasswordField
				label="New password"
				autocomplete="new-password"
				minlength={10}
				error={form?.message}
				hint="At least 10 characters."
			/>
			<button class="button-primary" disabled={submitting.busy}>
				{submitting.busy ? 'Saving…' : 'Save password'}
			</button>
		</form>
	</GlassCard>
</SoloScreen>
