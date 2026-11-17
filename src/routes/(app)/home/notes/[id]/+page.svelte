<script lang="ts">
	import NoteForm from '#lib/features/notes/NoteForm.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.note.title} · home base</title>
</svelte:head>

<PageHeader title="Edit note">
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
