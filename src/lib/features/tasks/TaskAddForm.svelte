<script lang="ts">
	import { isRepeat, type Repeat } from './repeat.js';
	import { enhance } from '$app/forms';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { Profile } from '#lib/types.js';
	import AssigneeChoice from './AssigneeChoice.svelte';
	import RepeatChoice from './RepeatChoice.svelte';

	interface Props {
		people: Profile[];
		/** Values and messages from a failed submit. */
		values?: Record<string, string>;
		errors?: Record<string, string | undefined>;
	}

	let { people, values, errors }: Props = $props();
	let input = $state<HTMLInputElement>();
</script>

<!--
	Options appear once you start typing, so the resting screen is just the field.
	Pure CSS (:has), no script needed.
-->
<form
	class="task-add"
	method="POST"
	action="?/add"
	use:enhance={() =>
		async ({ result, update }) => {
			await update({ reset: result.type === 'success' });
			if (result.type === 'success') input?.focus();
		}}
>
	<div class="title-row">
		<GlassSurface radius={18} />
		<label class="visually-hidden" for="task-title">New task</label>
		<input
			bind:this={input}
			id="task-title"
			name="title"
			placeholder="Add a task"
			autocomplete="off"
			enterkeyhint="done"
			maxlength="160"
			value={values?.title ?? ''}
			aria-invalid={errors?.title ? 'true' : undefined}
			required
		/>
		<button class="add-button" aria-label="Add task"><Icon name="plus" size={20} /></button>
	</div>
	{#if errors?.title}<p class="field-error">{errors.title}</p>{/if}

	<div class="options">
		<AssigneeChoice {people} value={values?.assigneeId ?? ''} error={errors?.assigneeId} />

		<fieldset class="field due">
			<legend class="field-label">When</legend>
			<div class="choice-pills">
				{#each [['none', 'No date'], ['today', 'Today'], ['tomorrow', 'Tomorrow'], ['date', 'Pick a date']] as [value, label] (value)}
					<label class="choice-pill">
						<input type="radio" name="due" {value} checked={(values?.due ?? 'none') === value} />
						{label}
					</label>
				{/each}
			</div>
			<label class="visually-hidden" for="task-due-date">Due date</label>
			<input
				id="task-due-date"
				class="field-input due-date"
				type="date"
				name="dueDate"
				value={values?.dueDate ?? ''}
			/>
			{#if errors?.dueOn}<p class="field-error">{errors.dueOn}</p>{/if}
		</fieldset>

		<RepeatChoice value={isRepeat(values?.repeat ?? '') ? (values?.repeat as Repeat) : 'none'} />
	</div>
</form>

<style>
	.task-add {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
	}

	.title-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-s);
		height: 56px;
		padding: 0 6px 0 18px;
		border-radius: var(--radius-field);
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
	}

	.title-row:focus-within {
		box-shadow:
			inset 0 0 0 1px var(--colour-accent-edge),
			0 0 0 3px var(--colour-accent-soft);
	}

	input[name='title'] {
		position: relative;
		z-index: 1;
		flex: 1;
		min-width: 0;
		height: 100%;
		border: 0;
		background: none;
		font-size: var(--text-body);
		outline: none;
	}

	input[name='title']::placeholder {
		color: var(--colour-text-faint);
	}

	.add-button {
		position: relative;
		z-index: 1;
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		border: 0;
		border-radius: 50%;
		background: var(--colour-accent);
		color: var(--colour-on-accent);
	}

	.options {
		display: none;
		flex-direction: column;
		gap: var(--space-m);
		padding: var(--space-s) 2px var(--space-xs);
	}

	/* Only while there's a title typed, so nothing shifts when focus moves away. */
	.task-add:has(input[name='title']:not(:placeholder-shown)) .options {
		display: flex;
	}

	.due-date {
		display: none;
		margin-top: var(--space-xs);
		max-width: 220px;
	}

	.due:has(input[value='date']:checked) .due-date {
		display: flex;
	}
</style>
