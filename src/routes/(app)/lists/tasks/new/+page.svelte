<script lang="ts">
	/** A new task: the same shape as a new plan (heading, AI helper, the form, one save button). */
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import TaskForm from '#lib/features/tasks/TaskForm.svelte';
	import AssistBox from '#lib/ui/AssistBox.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.newTask);

	const values = $derived(
		form?.values ?? {
			title: data.title,
			assigneeId: '',
			due: data.date ? 'date' : 'none',
			dueDate: data.date,
			repeat: 'none',
			notes: ''
		}
	);
</script>

<svelte:head>
	<title>New task · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/lists/tasks"><Icon name="back" size={18} /> Tasks</a>
	{/snippet}
</PageHeader>

{#if data.ai}
	<AssistBox
		action="?/describe"
		target=".task-form"
		label="Say it how you’d text it, and AI will fill in who, when and how often."
		placeholder="Chris to take the bins out every Tuesday"
		submitLabel="Fill in with AI"
		busyLabel="Working out who, when and how often…"
		outcome={form && 'assist' in form ? form.assist : null}
		focusOnFail="#task-form-title"
	/>
{/if}

{#key form}
	<TaskForm
		people={data.household.members}
		{values}
		errors={form && 'errors' in form ? form.errors : undefined}
		action="?/create"
		submitLabel="Add task"
	/>
{/key}
