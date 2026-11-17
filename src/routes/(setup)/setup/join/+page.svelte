<script lang="ts">
	import HomeForm from '#lib/features/homes/HomeForm.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Join a home · home base</title>
</svelte:head>

<SoloScreen title="Join a home" lead="Ask someone in the home for its name and password.">
	{#snippet top()}
		<a class="button-quiet" href="/setup"><Icon name="back" size={18} /> Back</a>
	{/snippet}

	<GlassCard>
		<HomeForm mode="join" name={form?.name} errors={form?.errors} message={form?.message} />
	</GlassCard>
</SoloScreen>
