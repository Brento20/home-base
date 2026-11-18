<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import HomeForm from '#lib/features/homes/HomeForm.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.joinHome);
</script>

<svelte:head>
	<title>Join a home · home base</title>
</svelte:head>

<SoloScreen title={heading} lead="Ask someone in the home for its name and password.">
	{#snippet top()}
		<a class="button-quiet" href="/setup"><Icon name="back" size={18} /> Back</a>
	{/snippet}

	<GlassCard>
		<HomeForm mode="join" name={form?.name} errors={form?.errors} message={form?.message} />
	</GlassCard>
</SoloScreen>
