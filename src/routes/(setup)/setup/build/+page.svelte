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
	const heading = pick(HEADINGS.buildHome);
</script>

<svelte:head>
	<title>Build a home · home base</title>
</svelte:head>

<SoloScreen
	title={heading}
	lead="Give it a name. Once it’s built, invite people with a link from Home settings."
>
	{#snippet top()}
		<a class="button-quiet" href="/setup"><Icon name="back" size={18} /> Back</a>
	{/snippet}

	<GlassCard>
		<HomeForm name={form?.name} errors={form?.errors} message={form?.message} />
	</GlassCard>
</SoloScreen>
