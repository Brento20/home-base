<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import PostComposer from '#lib/features/feed/PostComposer.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.postUpdate);
</script>

<svelte:head>
	<title>Post update · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/"><Icon name="back" size={18} /> Today</a>
	{/snippet}
</PageHeader>

<PostComposer errors={form?.errors} body={form?.body} maxLength={data.maxLength} />
