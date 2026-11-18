<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import ProfileForm from '#lib/features/account/ProfileForm.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.setupProfile);
</script>

<svelte:head>
	<title>Your profile · home base</title>
</svelte:head>

<SoloScreen title={heading} lead="This is how you’ll show up to the people you live with.">
	<GlassCard>
		<ProfileForm
			account={data.account}
			values={form?.values}
			errors={form?.errors}
			submitLabel="Continue"
			today={data.today}
		/>
	</GlassCard>

	{#snippet footer()}
		<form method="POST" action="/logout"><button class="button-quiet">Sign out</button></form>
	{/snippet}
</SoloScreen>
