<script lang="ts">
	import NoteForm from '#lib/features/notes/NoteForm.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>New note · home base</title>
</svelte:head>

<PageHeader title="New note">
	{#snippet lead()}
		<a class="button-quiet" href="/home"><Icon name="back" size={18} /> Home</a>
	{/snippet}
</PageHeader>

<NoteForm
	action=""
	values={form?.values ?? { title: '', body: '', isSecret: false }}
	errors={form?.errors}
	submitLabel="Add note"
	cancelHref="/home"
/>
