<script lang="ts">
	import HomeForm from '#lib/features/homes/HomeForm.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Build a home · home base</title>
</svelte:head>

<SoloScreen
	title="Build a home"
	lead="Give it a name and a password. Anyone you share both with can join."
>
	{#snippet top()}
		<a class="button-quiet" href="/setup"><Icon name="back" size={18} /> Back</a>
	{/snippet}

	<GlassCard>
		<HomeForm mode="build" name={form?.name} errors={form?.errors} message={form?.message} />
	</GlassCard>
</SoloScreen>
