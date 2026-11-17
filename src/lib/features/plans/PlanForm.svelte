<script lang="ts">
	/** Add and edit form for a plan: title, date, times or all day, location and notes. */
	import { enhance } from '$app/forms';
	import type { PlanField, PlanFormValues } from './plan-input.js';

	interface Props {
		values: PlanFormValues;
		errors?: Partial<Record<PlanField, string>>;
		action: string;
		submitLabel: string;
		/** Shows a Cancel link back to where you came from. */
		cancelHref?: string;
	}

	let { values, errors = {}, action, submitLabel, cancelHref }: Props = $props();
	let saving = $state(false);
</script>

<form
	method="POST"
	{action}
	class="form-stack plan-form"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<label class="field">
		<span class="field-label">What</span>
		<input
			class="field-input"
			name="title"
			value={values.title}
			placeholder="Dinner at home"
			maxlength="160"
			required
			aria-invalid={errors.title ? 'true' : undefined}
		/>
		{#if errors.title}<span class="field-error">{errors.title}</span>{/if}
	</label>

	<label class="field">
		<span class="field-label">Date</span>
		<input
			class="field-input date"
			type="date"
			name="date"
			value={values.date}
			required
			aria-invalid={errors.date ? 'true' : undefined}
		/>
		{#if errors.date}<span class="field-error">{errors.date}</span>{/if}
	</label>

	<label class="all-day">
		<input type="checkbox" name="allDay" checked={values.allDay} />
		<span class="switch" aria-hidden="true"></span>
		All day
	</label>

	<!-- Hidden with CSS while "All day" is on, so it works before any script loads. -->
	<div class="times field-row">
		<label class="field">
			<span class="field-label">Starts</span>
			<input
				class="field-input"
				type="time"
				name="startTime"
				value={values.startTime}
				aria-invalid={errors.startTime ? 'true' : undefined}
			/>
			{#if errors.startTime}<span class="field-error">{errors.startTime}</span>{/if}
		</label>
		<label class="field">
			<span class="field-label">Ends (optional)</span>
			<input
				class="field-input"
				type="time"
				name="endTime"
				value={values.endTime}
				aria-invalid={errors.endTime ? 'true' : undefined}
			/>
			{#if errors.endTime}<span class="field-error">{errors.endTime}</span>{/if}
		</label>
	</div>

	<label class="field">
		<span class="field-label">Where (optional)</span>
		<input class="field-input" name="location" value={values.location} maxlength="200" />
		{#if errors.location}<span class="field-error">{errors.location}</span>{/if}
	</label>

	<label class="field">
		<span class="field-label">Notes (optional)</span>
		<textarea
			class="field-input"
			name="notes"
			maxlength="2000"
			rows="3"
			placeholder="Brenton’s cooking">{values.notes}</textarea
		>
		{#if errors.notes}<span class="field-error">{errors.notes}</span>{/if}
	</label>

	<div class="form-actions">
		<button class="button-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
		{#if cancelHref}<a class="button-quiet" href={cancelHref}>Cancel</a>{/if}
	</div>
</form>

<style>
	.date {
		max-width: 220px;
	}

	.plan-form:has(input[name='allDay']:checked) .times {
		display: none;
	}

	.all-day {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: var(--tap-target);
		font-size: var(--text-body);
		cursor: pointer;
	}

	.all-day input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.switch {
		position: relative;
		width: 50px;
		height: 30px;
		border-radius: var(--radius-pill);
		background: rgb(255 255 255 / 0.12);
		transition: background-color var(--duration-quick) var(--ease-out);
	}

	.switch::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
		transition: transform var(--duration-settle) var(--ease-spring);
	}

	.all-day input:checked + .switch {
		background: var(--colour-accent);
	}

	.all-day input:checked + .switch::after {
		transform: translateX(20px);
	}

	.all-day input:focus-visible + .switch {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}
</style>
