<script lang="ts">
	/**
	 * Add and edit form for a task, laid out like the plan form so the two feel like one app:
	 * the same frame (FormShell), questions as labels, and optional extras tucked behind chips.
	 *
	 * Always there: what needs doing, who's on it (or Anyone) and when. Behind "+ Repeat" and
	 * "+ Note": how often it comes back (the same repeats as everywhere) and a note. A task that
	 * already has either shows it open. Chips are labels of hidden checkboxes and CSS shows the
	 * field, so it works before any script loads, as on the plan form.
	 */
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import FormShell from '#lib/ui/FormShell.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	import type { Profile } from '#lib/types.js';
	import AssigneeChoice from './AssigneeChoice.svelte';
	import DueChoice from './DueChoice.svelte';
	import { isRepeat, type Repeat } from './repeat.js';
	import RepeatChoice from './RepeatChoice.svelte';

	export interface TaskFormValues {
		title: string;
		assigneeId: string;
		due: string;
		dueDate: string;
		repeat: string;
		notes: string;
	}

	interface Props {
		people: Profile[];
		values: TaskFormValues;
		errors?: Partial<Record<'title' | 'assigneeId' | 'dueOn' | 'notes', string>>;
		action: string;
		submitLabel: string;
	}

	let { people, values, errors = {}, action, submitLabel }: Props = $props();

	const repeat = $derived<Repeat>(isRepeat(values.repeat) ? (values.repeat as Repeat) : 'none');
	const repeatOpen = $derived(repeat !== 'none');
	const notesOpen = $derived(Boolean(values.notes || errors.notes));
	let repeatField = $state<HTMLElement>();
	let notesInput = $state<HTMLTextAreaElement>();

	/** Opening a field from its chip moves you to it. */
	function reveal(event: Event, field: HTMLElement | undefined) {
		if (!(event.currentTarget as HTMLInputElement).checked || !field) return;
		const first = field.matches('input, textarea')
			? field
			: field.querySelector<HTMLElement>('input, textarea');
		first?.focus();
	}
</script>

<FormShell {action} {submitLabel} class="task-form">
	<label class="field">
		<span class="field-label">What needs doing?</span>
		<input
			id="task-form-title"
			class="field-input"
			name="title"
			value={values.title}
			placeholder={PLACEHOLDERS.task[0]}
			use:placeholderReel={PLACEHOLDERS.task}
			maxlength="160"
			required
			aria-invalid={errors.title ? 'true' : undefined}
		/>
		{#if errors.title}<span class="field-error">{errors.title}</span>{/if}
	</label>

	<AssigneeChoice
		{people}
		value={values.assigneeId}
		error={errors.assigneeId}
		label="Who’s on it?"
	/>

	<DueChoice due={values.due} date={values.dueDate} error={errors.dueOn} />

	<div class="extra repeat" bind:this={repeatField}>
		<RepeatChoice value={repeat} />
	</div>

	<label class="field extra notes">
		<span class="field-label">Anything to add?</span>
		<textarea
			class="field-input"
			name="notes"
			maxlength="2000"
			rows="3"
			placeholder="Where the key is, which bin, what to buy…"
			bind:this={notesInput}>{values.notes}</textarea
		>
		{#if errors.notes}<span class="field-error">{errors.notes}</span>{/if}
	</label>

	<!-- No name on these: they only show and hide fields, and aren't sent with the form. -->
	<div class="extras">
		<input
			class="extra-toggle"
			type="checkbox"
			id="task-add-repeat"
			checked={repeatOpen}
			onchange={(event) => reveal(event, repeatField)}
		/>
		<label class="extra-chip" for="task-add-repeat"><Icon name="plus" size={16} /> Repeat</label>
		<input
			class="extra-toggle"
			type="checkbox"
			id="task-add-notes"
			checked={notesOpen}
			onchange={(event) => reveal(event, notesInput)}
		/>
		<label class="extra-chip" for="task-add-notes"><Icon name="plus" size={16} /> Note</label>
	</div>
</FormShell>

<style>
	/* Optional fields stay tucked away until their chip is tapped (chip styles: forms.css). A
	   chip can't be closed again, as on the plan form; "Once" is how you stop a repeat. */
	:global(.task-form:has(#task-add-repeat:not(:checked)) .repeat),
	:global(.task-form:has(#task-add-notes:not(:checked)) .notes),
	:global(.task-form:has(#task-add-repeat:checked):has(#task-add-notes:checked) .extras) {
		display: none;
	}
</style>
