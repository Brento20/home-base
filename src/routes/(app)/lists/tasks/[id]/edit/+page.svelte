<script lang="ts">
	import { enhance } from '$app/forms';
	import AssigneeChoice from '#lib/features/tasks/AssigneeChoice.svelte';
	import RepeatChoice from '#lib/features/tasks/RepeatChoice.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(
		form?.values ?? {
			title: data.task.title,
			assigneeId: data.task.assigneeId ?? '',
			dueDate: data.task.dueOn ?? '',
			repeat: data.task.repeat
		}
	);
	const errors = $derived(form?.errors ?? {});
	let saving = $state(false);
</script>

<svelte:head>
	<title>Edit {data.task.title} · home base</title>
</svelte:head>

<PageHeader title="Edit task">
	{#snippet lead()}
		<a class="button-quiet" href="/lists/tasks/{data.task.id}"
			><Icon name="back" size={18} /> Task</a
		>
	{/snippet}
</PageHeader>

<form
	method="POST"
	action="?/save"
	class="form-stack"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<label class="field">
		<span class="field-label">Task</span>
		<input
			class="field-input"
			name="title"
			value={values.title}
			maxlength="160"
			required
			aria-invalid={errors.title ? 'true' : undefined}
		/>
		{#if errors.title}<span class="field-error">{errors.title}</span>{/if}
	</label>

	<AssigneeChoice
		people={data.household.members}
		value={values.assigneeId}
		error={errors.assigneeId}
	/>

	<label class="field">
		<span class="field-label">Due</span>
		<input class="field-input due" type="date" name="dueDate" value={values.dueDate} />
		{#if errors.dueOn}<span class="field-error">{errors.dueOn}</span>{/if}
	</label>

	<RepeatChoice value={values.repeat} />

	<div class="form-actions">
		<button class="button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
	</div>
</form>

<style>
	.due {
		max-width: 220px;
	}
</style>
