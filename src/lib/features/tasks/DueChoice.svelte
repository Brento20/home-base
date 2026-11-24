<script lang="ts">
	/**
	 * When a task's due: No date, Today, Tomorrow, or Pick a date (which shows the same date
	 * picker as a plan's). Pure CSS shows the picker, so it works before any script loads.
	 */
	interface Props {
		/** 'none' | 'today' | 'tomorrow' | 'date' */
		due?: string;
		/** 'YYYY-MM-DD' when picking a date. */
		date?: string;
		error?: string;
	}

	let { due = 'none', date = '', error }: Props = $props();
	const CHOICES = [
		['none', 'No date'],
		['today', 'Today'],
		['tomorrow', 'Tomorrow'],
		['date', 'Pick a date']
	] as const;
</script>

<fieldset class="field due">
	<legend class="field-label">When?</legend>
	<div class="choice-pills">
		{#each CHOICES as [value, label] (value)}
			<label class="choice-pill">
				<input type="radio" name="due" {value} checked={due === value} />
				{label}
			</label>
		{/each}
	</div>
	<label class="visually-hidden" for="task-due-date">Due date</label>
	<input id="task-due-date" class="field-input due-date" type="date" name="dueDate" value={date} />
	{#if error}<p class="field-error">{error}</p>{/if}
</fieldset>

<style>
	.due-date {
		display: none;
		margin-top: var(--space-xs);
		max-width: 220px;
	}

	.due:has(input[value='date']:checked) .due-date {
		display: flex;
	}
</style>
