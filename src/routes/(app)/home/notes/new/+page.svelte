<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import NoteForm from '#lib/features/notes/NoteForm.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	import { page } from '$app/state';

	let { form }: PageProps = $props();

	// Started from Home's House info: a note shaped so the Wi-Fi card or a contact can read it.
	const TEMPLATES: Record<string, { title: string; body: string; isSecret: boolean }> = {
		wifi: { title: 'Wi-Fi', body: 'Network: \nPassword: ', isSecret: true },
		contact: { title: '', body: '', isSecret: false }
	};
	const examples =
		page.url.searchParams.get('template') === 'contact'
			? {
					title: ['Plumber', 'Landlord', 'Vet', 'Electrician'],
					body: ['Dave · 0412 345 678', 'Priya at the agency · (02) 9555 0134']
				}
			: undefined;
	const start = TEMPLATES[page.url.searchParams.get('template') ?? ''] ?? {
		title: '',
		body: '',
		isSecret: false
	};

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.newNote);
</script>

<svelte:head>
	<title>New note · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/home"><Icon name="back" size={18} /> Home</a>
	{/snippet}
</PageHeader>

<NoteForm
	action=""
	values={form?.values ?? start}
	errors={form?.errors}
	submitLabel="Pin it up"
	{examples}
/>
