<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import NoteForm from '#lib/features/notes/NoteForm.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.editNote);
</script>

<svelte:head>
	<title>{data.note.title} · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/home"><Icon name="back" size={18} /> Home</a>
	{/snippet}
</PageHeader>

<NoteForm
	action="?/save"
	values={form?.values ?? data.note}
	errors={form?.errors}
	submitLabel="Save"
	cancelHref="/home"
/>

<div class="danger">
	<ConfirmDelete action="?/delete" label="Delete note" />
</div>

<style>
	.danger {
		margin-top: var(--space-2xl);
	}
</style>
