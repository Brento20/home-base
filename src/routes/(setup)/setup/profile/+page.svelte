<script lang="ts">
	import ProfileForm from '#lib/features/account/ProfileForm.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Your profile · home base</title>
</svelte:head>

<SoloScreen title="About you" lead="This is how you’ll show up to the people you live with.">
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
