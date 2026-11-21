<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { AI_OOPS, PLACEHOLDERS } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	import { isRepeat, type Repeat } from './repeat.js';
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { clearFilled, markFilled, restore, snapshot, type Snapshot } from '#lib/ui/ai-fill.js';
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
	let form = $state<HTMLFormElement>();
	let reading = $state(false);
	let before: Snapshot | null = null;
	const oops = pick(AI_OOPS);

	// What's typed and picked lives here, so redrawing the form (when ✨ starts or stops) can't
	// put back the starting values over it. A new result from the server (a fill, an error)
	// resets them.
	let title = $state('');
	let due = $state('none');
	let dueDate = $state('');
	$effect.pre(() => {
		title = values?.title ?? '';
		due = values?.due ?? 'none';
		dueDate = values?.dueDate ?? '';
	});

	/** Back to what was typed before ✨: the page drops the fill, then the snapshot goes back. */
	async function undo() {
		const saved = before;
		clearFilled(form);
		await goto(page.url.pathname + page.url.search, { replace: true, reset: false });
		await tick();
		if (saved) restore(form, saved);
		clearFilled(form);
		before = null;
		input?.focus();
	}
</script>

<!--
	Options appear once you start typing, so the resting screen is just the field.
	Pure CSS (:has), no script needed.
-->
<form
	bind:this={form}
	class="task-add"
	method="POST"
	action="?/add"
	use:enhance={({ action }) => {
		const quick = action.search.includes('/quick');
		reading = quick;
		if (quick) before = snapshot(form);
		return async ({ result, update }) => {
			// A ✨ fill keeps the form as filled; a real add clears it for the next one.
			const added = result.type === 'success' && !quick;
			await update({ reset: added });
			await tick();
			reading = false;
			if (quick && result.type === 'success' && result.data?.assist === 'filled')
				markFilled(form, before ?? new Map());
			if (added) {
				clearFilled(form);
				title = '';
				due = 'none';
				dueDate = '';
			}
			if (added || quick) input?.focus();
		};
	}}
	aria-busy={reading}
>
	<div class="title-row" data-ai-ring>
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
			bind:value={title}
			aria-invalid={errors?.title ? 'true' : undefined}
			required
		/>
		{#if ai}
			<!-- Return on the keyboard presses a form's first button, so this one is first: it
			     adds the task, as the visible + does. Screen readers and Tab skip it. -->
			<button class="visually-hidden" tabindex="-1" aria-hidden="true">Add task</button>
			<!-- Same form, other action: reads the words and fills the options below. -->
			<button
				class="quick-button"
				class:ai-busy={reading}
				formaction="?/quick"
				formnovalidate
				aria-label={reading
					? 'Working out who and when…'
					: 'Fill in who, when and how often with AI'}
				title="Fill in with AI"
				disabled={reading}
			>
				<Icon name="sparkle" size={20} />
			</button>
		{/if}
		<button class="add-button round-accent" aria-label="Add task"
			><Icon name="plus" size={20} /></button
		>
	</div>
	{#if errors?.title}<p class="field-error">{errors.title}</p>{/if}
	{#if reading}
		<p class="assist-note" role="status">Working out who, when and how often…</p>
	{:else if assist === 'failed'}
		<p class="assist-note" role="status">{oops}</p>
	{:else if assist === 'filled'}
		<div class="assist-note filled" role="status">
			<p>
				Filled in with AI: the glowing ones. AI can get things wrong, so tap + if it looks right.
			</p>
			<button type="button" class="undo" onclick={undo}>Undo</button>
		</div>
	{/if}

	<div class="options">
		<AssigneeChoice {people} value={values?.assigneeId ?? ''} error={errors?.assigneeId} />

		<fieldset class="field due">
			<legend class="field-label">When</legend>
			<div class="choice-pills">
				{#each [['none', 'No date'], ['today', 'Today'], ['tomorrow', 'Tomorrow'], ['date', 'Pick a date']] as [value, label] (value)}
					<label class="choice-pill">
						<input type="radio" name="due" {value} bind:group={due} />
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
				bind:value={dueDate}
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

	/* Above the field's glass. */
	.add-button {
		position: relative;
		z-index: 1;
	}

	/* Always there, so it's easy to find; dimmed until there's something typed for it to read. */
	.quick-button {
		position: relative;
		z-index: 1;
		display: grid;
		flex: none;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--colour-accent);
		transition: transform var(--duration-release) var(--spring-gentle);
	}

	.task-add:has(input[name='title']:placeholder-shown) .quick-button {
		opacity: 0.4;
		pointer-events: none;
	}

	/* The title row gets the ring when ✨ rewrites the title. */
	.title-row:global([data-ai-filled]) {
		border: 1.5px solid transparent;
	}

	.quick-button:global([data-pressed]) {
		transform: scale(0.88);
		transition-duration: var(--duration-press);
	}

	.assist-note {
		margin: 0;
		padding: 0 4px;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.assist-note.filled {
		display: flex;
		align-items: flex-start;
		gap: var(--space-m);
	}

	.assist-note p {
		flex: 1;
		margin: 0;
	}

	.undo {
		flex: none;
		min-height: var(--tap-target);
		margin: -12px 0;
		padding: 0 4px;
		border: 0;
		background: none;
		color: var(--colour-text);
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
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
