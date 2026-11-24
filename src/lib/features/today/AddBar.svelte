<script lang="ts">
	/**
	 * The add bar on Today, sitting on top of the Coming up row it feeds. Type, then Task adds it
	 * straight away (for anyone, no date, like the quick bar on Tasks) and Plan carries the words
	 * to New plan, where a day and time get set. Return adds it as a task. The buttons open on a
	 * row under the field while something's typed, so the field keeps its full width.
	 */
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';

	interface Props {
		/** What was typed and the problem with it, from a failed add. */
		values?: { title?: string };
		errors?: { title?: string };
		/** Cards below, so be as wide as one; with nothing coming up, the empty card is full width. */
		cards?: boolean;
	}

	let { values, errors, cards = true }: Props = $props();
	let input = $state<HTMLInputElement>();
	let text = $derived(values?.title ?? '');
	let saving = $state(false);
	const typed = $derived(text.trim());
	const planHref = $derived(`/plans/new?text=${encodeURIComponent(typed)}`);
</script>

<form
	class="add-bar"
	class:cards
	class:typed
	method="POST"
	action="?/addTask"
	aria-label="Add a task or plan"
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			const added = result.type === 'success';
			await update({ reset: added });
			saving = false;
			if (added) text = '';
			await tick();
			input?.blur();
		};
	}}
>
	<div class="bar">
		<GlassSurface radius={18} />
		<span class="lead" aria-hidden="true"><Icon name="plus" size={18} /></span>
		<label class="visually-hidden" for="add-bar">Add a task or plan</label>
		<input
			bind:this={input}
			id="add-bar"
			name="title"
			placeholder="Add a task or plan"
			autocomplete="off"
			enterkeyhint="done"
			maxlength="160"
			bind:value={text}
			aria-invalid={errors?.title ? 'true' : undefined}
			aria-describedby={errors?.title ? 'add-bar-error' : undefined}
			required
		/>
	</div>
	<!-- Under the field, opening once something's typed; out of reach until then. -->
	<div class="actions" inert={!typed}>
		<div class="actions-row">
			<button class="action task" aria-label="Add “{typed}” as a task" disabled={saving}
				>Add task</button
			>
			<a class="action plan" href={planHref} aria-label="Make “{typed}” a plan"
				><GlassSurface radius={16} /><span>Make it a plan</span></a
			>
		</div>
	</div>
	{#if errors?.title}<p class="field-error" id="add-bar-error">{errors.title}</p>{/if}
</form>

<style>
	.add-bar {
		/* Above the Coming up row's glow padding, which reaches up under the bar. */
		position: relative;
		z-index: 2;
	}

	/* As wide as the card beneath it, so the two read as one stack (the sum .slide uses in
	   ComingUp.svelte). */
	.add-bar.cards {
		width: min(82vw, 100% - 7vw);
	}

	.bar {
		position: relative;
		display: flex;
		align-items: center;
		gap: 6px;
		height: 48px;
		padding: 0 14px;
		border-radius: var(--radius-field);
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
	}

	.bar:focus-within {
		box-shadow:
			inset 0 0 0 1px var(--colour-accent-edge),
			0 0 0 3px var(--colour-accent-soft);
	}

	.lead,
	input {
		position: relative;
		z-index: 1;
	}

	.lead {
		display: grid;
		place-items: center;
		color: var(--colour-text-faint);
		transition: color var(--duration-quick) var(--ease-out);
	}

	.bar:focus-within .lead,
	.typed .lead {
		color: var(--colour-accent);
	}

	input {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: 0;
		background: none;
		font-size: var(--text-body);
		outline: none;
	}

	input::placeholder {
		color: var(--colour-text-faint);
	}

	/* Folded to nothing until something's typed, then opens: the cards below ease down 48px. */
	.actions {
		display: grid;
		grid-template-rows: 0fr;
		opacity: 0;
		transition:
			grid-template-rows var(--duration-settle) var(--ease-out),
			opacity var(--duration-quick) var(--ease-out);
	}

	.typed .actions {
		grid-template-rows: 1fr;
		opacity: 1;
	}

	.actions-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		min-height: 0;
		overflow: hidden;
	}

	.action {
		position: relative;
		display: grid;
		place-items: center;
		height: 40px;
		margin-top: 8px;
		border: 0;
		border-radius: 16px;
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
		text-decoration: none;
		transition: transform var(--duration-release) var(--spring-gentle);
	}

	.task {
		background: var(--colour-accent);
		color: var(--colour-on-accent);
	}

	.plan {
		color: var(--colour-text);
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
	}

	.plan > span {
		position: relative;
		z-index: 1;
	}

	.action:global([data-pressed]) {
		transform: scale(0.96);
		transition-duration: var(--duration-press);
	}

	.field-error {
		margin: 6px 0 0 14px;
	}

	@media (prefers-reduced-motion: reduce) {
		.actions {
			transition: none;
		}
	}
</style>
