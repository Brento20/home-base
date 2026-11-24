<script lang="ts">
	/** Changing a task: the same form as a new one (TaskForm), as plans do. */
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import TaskForm from '#lib/features/tasks/TaskForm.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const heading = pick(HEADINGS.editTask);
	const values = $derived(
		form?.values ?? {
			title: data.task.title,
			assigneeId: data.task.assigneeId ?? '',
			due: data.task.dueOn ? 'date' : 'none',
			dueDate: data.task.dueOn ?? '',
			repeat: data.task.repeat,
			notes: data.task.notes
		}
	);
</script>

<svelte:head>
	<title>Edit {data.task.title} · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/lists/tasks/{data.task.id}"
			><Icon name="back" size={18} /> Task</a
		>
	{/snippet}
</PageHeader>

{#key form}
	<TaskForm
		people={data.household.members}
		{values}
		errors={form?.errors}
		action="?/save"
		submitLabel="Save"
	/>
{/key}
