<script lang="ts">
	import ListsNav from '#lib/features/lists/ListsNav.svelte';
	import TaskAddForm from '#lib/features/tasks/TaskAddForm.svelte';
	import TaskList from '#lib/features/tasks/TaskList.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
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
	values={form && 'values' in form ? form.values : undefined}
	errors={form && 'errors' in form ? form.errors : undefined}
/>

<TaskList tasks={data.tasks} people={data.household.members} today={data.today} />
