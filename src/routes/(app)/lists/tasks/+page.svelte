<script lang="ts">
	import TaskAddForm from '#lib/features/tasks/TaskAddForm.svelte';
	import TaskList from '#lib/features/tasks/TaskList.svelte';
	import { kept } from '#lib/ui/kept.svelte.js';
	import Reveal from '#lib/ui/Reveal.svelte';
	import UndoToast from '#lib/ui/UndoToast.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// The copy this phone kept until fresh data lands (src/lib/ui/kept.svelte.ts).
	const screen = kept(
		() => 'tasks',
		() => data.screen
	);
</script>

<svelte:head>
	<title>Tasks · home base</title>
</svelte:head>

<TaskAddForm
	people={data.household.members}
	ai={data.ai}
	assist={form && 'assist' in form ? form.assist : null}
	values={form && 'values' in form ? form.values : undefined}
	errors={form && 'errors' in form ? form.errors : undefined}
/>

<Reveal
	of={screen}
	placeholder={[58, 58, 58, 58, 58, 58]}
	radius={16}
	gap={8}
	label="Loading tasks"
>
	{#snippet children({ tasks })}
		<TaskList {tasks} people={data.household.members} today={data.today} meId={data.me.id} />
	{/snippet}
</Reveal>

{#if form && 'ticked' in form && form.ticked}
	<UndoToast
		key={form.ticked.id}
		message="Ticked off: {form.ticked.title}"
		action="?/undo"
		fields={{ taskId: form.ticked.id }}
	/>
{/if}
