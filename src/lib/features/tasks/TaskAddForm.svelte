<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { AI_OOPS, PLACEHOLDERS } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
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
		/** Whether the ✨ quick-add button shows (an AI key is set). */
		ai?: boolean;
		/** What the last ✨ did. */
		assist?: 'filled' | 'failed' | null;
	}

	let { people, values, errors, ai = false, assist = null }: Props = $props();
	let input = $state<HTMLInputElement>();
	let reading = $state(false);
	const oops = pick(AI_OOPS);
</script>

<!--
	Options appear once you start typing, so the resting screen is just the field.
	Pure CSS (:has), no script needed.
-->
<form
	class="task-add"
	method="POST"
	action="?/add"
	use:enhance={({ action }) => {
		const quick = action.search.includes('/quick');
		reading = quick;
		return async ({ result, update }) => {
			reading = false;
			// A ✨ fill keeps the form as filled; a real add clears it for the next one.
			const added = result.type === 'success' && !quick;
			await update({ reset: added });
			if (added || quick) input?.focus();
		};
	}}
	aria-busy={reading}
>
	<div class="title-row">
		<GlassSurface radius={18} />
		<label class="visually-hidden" for="task-title">New task</label>
		<input
			bind:this={input}
			id="task-title"
			name="title"
			placeholder={PLACEHOLDERS.task[0]}
			use:placeholderReel={PLACEHOLDERS.task}
			autocomplete="off"
			enterkeyhint="done"
			maxlength="160"
			value={values?.title ?? ''}
			aria-invalid={errors?.title ? 'true' : undefined}
			required
		/>
		{#if ai}
			<!-- Same form, other action: reads the words and fills the options below. -->
			<button
				class="quick-button"
				formaction="?/quick"
				formnovalidate
				aria-label="Fill in who and when from what I typed"
				disabled={reading}
			>
				{#if reading}<span class="spinner" aria-hidden="true"></span>{:else}<Icon
						name="sparkle"
						size={20}
					/>{/if}
			</button>
		{/if}
		<button class="add-button" aria-label="Add task"><Icon name="plus" size={20} /></button>
	</div>
	{#if errors?.title}<p class="field-error">{errors.title}</p>{/if}
	{#if assist === 'failed' && !reading}<p class="assist-note" role="status">{oops}</p>{/if}
	{#if assist === 'filled' && !reading}<p class="assist-note" role="status">
			Filled in below. Tap + if it looks right.
		</p>{/if}

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
		transition:
			transform var(--duration-release) var(--spring-gentle),
			background-color var(--duration-quick) var(--ease-out);
	}

	.add-button:global([data-pressed]) {
		transform: scale(0.9);
		background: var(--colour-accent-pressed);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}

	/* Only once there's something typed for it to read. */
	.quick-button {
		position: relative;
		z-index: 1;
		display: none;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--colour-accent);
		transition: transform var(--duration-release) var(--spring-gentle);
	}

	.task-add:has(input[name='title']:not(:placeholder-shown)) .quick-button {
		display: grid;
	}

	.quick-button:global([data-pressed]) {
		transform: scale(0.88);
		transition-duration: var(--duration-press);
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.assist-note {
		margin: 0;
		padding: 0 4px;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
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
