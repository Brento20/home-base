<script lang="ts">
	/**
	 * Schedule (or reschedule) a dinner: the day, an optional time and who's cooking. Used in a
	 * Sheet from a recipe, the cook view and the "Did you make it?" card.
	 */
	import { enhance } from '$app/forms';
	import AssigneeChoice from '#lib/features/tasks/AssigneeChoice.svelte';
	import { addDays } from '#lib/time.js';
	import type { Profile } from '#lib/types.js';

	interface Props {
		action: string;
		people: Profile[];
		today: string;
		/** Sent with the form: the servings for a new dinner, or the dinner being moved. */
		hidden?: Record<string, string | number>;
		values?: { dueOn?: string | null; dueTime?: string | null; assigneeId?: string | null };
		submitLabel: string;
		onsaved: (data: Record<string, unknown> | undefined) => void;
	}

	let { action, people, today, hidden = {}, values = {}, submitLabel, onsaved }: Props = $props();

	const days = $derived(Array.from({ length: 7 }, (_, index) => addDays(today, index)));
	const dayLabel = (iso: string, index: number) => {
		if (index === 0) return 'Tonight';
		if (index === 1) return 'Tomorrow';
		const date = new Date(`${iso}T12:00:00Z`);
		return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
	};

	// A day outside the coming week (when moving a dinner) starts in "Another day".
	const initialDay = $derived(
		!values.dueOn ? today : days.includes(values.dueOn) ? values.dueOn : 'other'
	);
	let day = $state<string | null>(null);
	const currentDay = $derived(day ?? initialDay);

	let errors = $state<Record<string, string>>({});
	let saving = $state(false);
</script>

<form
	method="POST"
	{action}
	class="form-stack"
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'failure') {
				errors = (result.data?.errors as Record<string, string>) ?? {};
				return;
			}
			errors = {};
			if (result.type === 'success') onsaved(result.data);
			await update({ reset: false, invalidateAll: true });
		};
	}}
>
	{#each Object.entries(hidden) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}

	<fieldset class="field">
		<legend class="field-label">Which night?</legend>
		<div class="choice-pills">
			{#each days as iso, index (iso)}
				<label class="choice-pill">
					<input
						type="radio"
						name="day"
						value={iso}
						checked={currentDay === iso}
						onchange={() => (day = iso)}
					/>
					{dayLabel(iso, index)}
				</label>
			{/each}
			<label class="choice-pill">
				<input
					type="radio"
					name="day"
					value="other"
					checked={currentDay === 'other'}
					onchange={() => (day = 'other')}
				/>
				Another day
			</label>
		</div>
		{#if currentDay === 'other'}
			<input
				class="field-input other-date"
				type="date"
				name="otherDate"
				min={today}
				value={values.dueOn && !days.includes(values.dueOn) ? values.dueOn : ''}
				aria-label="Pick a day"
			/>
		{/if}
		{#if errors.dueOn}<span class="field-error">{errors.dueOn}</span>{/if}
	</fieldset>

	<label class="field">
		<span class="field-label">What time? (optional)</span>
		<input class="field-input time" type="time" name="dueTime" value={values.dueTime ?? ''} />
		{#if errors.dueTime}<span class="field-error">{errors.dueTime}</span>{/if}
	</label>

	<AssigneeChoice
		{people}
		label="Who’s cooking?"
		value={values.assigneeId ?? ''}
		error={errors.assigneeId}
	/>

	<button class="button-primary button-block" disabled={saving}>
		{saving ? 'Saving…' : submitLabel}
	</button>
</form>

<style>
	.other-date {
		max-width: 220px;
		margin-top: var(--space-s);
	}

	.time {
		max-width: 160px;
	}
</style>
