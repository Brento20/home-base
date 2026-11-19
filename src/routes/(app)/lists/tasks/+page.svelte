<script lang="ts">
	import ListsNav from '#lib/features/lists/ListsNav.svelte';
	import TaskAddForm from '#lib/features/tasks/TaskAddForm.svelte';
	import TaskList from '#lib/features/tasks/TaskList.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import UndoToast from '#lib/ui/UndoToast.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Tasks · home base</title>
</svelte:head>

<PageHeader title="Lists" />
<ListsNav />

<TaskAddForm
	people={data.household.members}
	ai={data.ai}
	assist={form && 'assist' in form ? form.assist : null}
	values={form && 'values' in form ? form.values : undefined}
	errors={form && 'errors' in form ? form.errors : undefined}
/>

<TaskList tasks={data.tasks} people={data.household.members} today={data.today} />

{#if form && 'ticked' in form && form.ticked}
	<UndoToast
		key={form.ticked.id}
		message="Ticked off: {form.ticked.title}"
		action="?/undo"
		fields={{ taskId: form.ticked.id }}
	/>
{/if}
