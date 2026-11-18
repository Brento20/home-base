<script lang="ts">
	/**
	 * Add and edit form for a plan: title, date, times or all day, location and notes.
	 *
	 * Where and notes are optional, so they start tucked behind "+ Place" and "+ Note" chips and
	 * the form opens on one question. A chip is the label of a hidden checkbox and CSS shows the
	 * field, so it works before any script loads. A plan that already has one shows it open.
	 * Optional fields keep a still placeholder; only "What's happening?" gets the moving reel.
	 */
	import { enhance } from '$app/forms';
	import { pick } from '#lib/copy/pick.js';
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import Icon from '#lib/ui/Icon.svelte';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	import type { PlanField, PlanFormValues } from './plan-input.js';

	interface Props {
		values: PlanFormValues;
		errors?: Partial<Record<PlanField, string>>;
		action: string;
		submitLabel: string;
		/** Shows a Cancel link back to where you came from. */
		cancelHref?: string;
		/** The feed post this plan is being made from, kept with the plan when it's saved. */
		postId?: string | null;
	}

	let { values, errors = {}, action, submitLabel, cancelHref, postId = null }: Props = $props();
	let saving = $state(false);

	const wherePlaceholder = pick(PLACEHOLDERS.planWhere);
	const notesPlaceholder = pick(PLACEHOLDERS.planNotes);
	// A plan that already has a place or note, or comes back with an error on one, shows it open.
	const whereOpen = $derived(Boolean(values.location || errors.location));
	const notesOpen = $derived(Boolean(values.notes || errors.notes));
	let whereInput = $state<HTMLInputElement>();
	let notesInput = $state<HTMLTextAreaElement>();

	/** Opening a field from its chip puts you straight into it. */
	function reveal(event: Event, field: HTMLElement | undefined) {
		if ((event.currentTarget as HTMLInputElement).checked) field?.focus();
	}
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
	{#if postId}<input type="hidden" name="postId" value={postId} />{/if}

	<label class="field">
		<span class="field-label">What’s happening?</span>
		<input
			class="field-input"
			name="title"
			value={values.title}
			placeholder={PLACEHOLDERS.planTitle[0]}
			use:placeholderReel={PLACEHOLDERS.planTitle}
			maxlength="160"
			required
			aria-invalid={errors.title ? 'true' : undefined}
		/>
		{#if errors.title}<span class="field-error">{errors.title}</span>{/if}
	</label>

	<label class="field">
		<span class="field-label">When?</span>
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

	<label class="field extra where">
		<span class="field-label">Where?</span>
		<input
			class="field-input"
			name="location"
			value={values.location}
			maxlength="200"
			placeholder={wherePlaceholder}
			bind:this={whereInput}
		/>
		{#if errors.location}<span class="field-error">{errors.location}</span>{/if}
	</label>

	<label class="field extra notes">
		<span class="field-label">Anything to add?</span>
		<textarea
			class="field-input"
			name="notes"
			maxlength="2000"
			rows="3"
			placeholder={notesPlaceholder}
			bind:this={notesInput}>{values.notes}</textarea
		>
		{#if errors.notes}<span class="field-error">{errors.notes}</span>{/if}
	</label>

	<!-- No name on these: they only show and hide fields, and aren't sent with the form. -->
	<div class="extras">
		<input
			class="extra-toggle"
			type="checkbox"
			id="plan-add-where"
			checked={whereOpen}
			onchange={(event) => reveal(event, whereInput)}
		/>
		<label class="extra-chip" for="plan-add-where"><Icon name="plus" size={16} /> Place</label>
		<input
			class="extra-toggle"
			type="checkbox"
			id="plan-add-notes"
			checked={notesOpen}
			onchange={(event) => reveal(event, notesInput)}
		/>
		<label class="extra-chip" for="plan-add-notes"><Icon name="plus" size={16} /> Note</label>
	</div>

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

	/* Optional fields stay tucked away until their chip is tapped, and the chip then goes. */
	.plan-form:has(#plan-add-where:not(:checked)) .where,
	.plan-form:has(#plan-add-notes:not(:checked)) .notes,
	.extra-toggle:checked + .extra-chip,
	.plan-form:has(#plan-add-where:checked):has(#plan-add-notes:checked) .extras {
		display: none;
	}

	.extras {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.extra-toggle {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.extra-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 40px;
		padding: 0 16px 0 12px;
		border: 1px solid rgb(255 255 255 / 0.14);
		border-radius: var(--radius-pill);
		background: rgb(255 255 255 / 0.05);
		color: var(--colour-text-muted);
		font-size: var(--text-small);
		cursor: pointer;
		transition:
			background-color var(--duration-quick) var(--ease-out),
			transform var(--duration-release) var(--spring-gentle);
	}

	.extra-chip:global([data-pressed]) {
		background: rgb(255 255 255 / 0.1);
		transform: scale(0.95);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}

	.extra-toggle:focus-visible + .extra-chip {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}

	/* A field opening from its chip eases in rather than popping. */
	.extra {
		animation: extra-in 320ms var(--ease-out);
	}

	@keyframes extra-in {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.extra {
			animation: none;
		}
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
