<script lang="ts">
	/**
	 * The quick add bar at the top of Tasks: type a chore, tap +, done. It's added for anyone,
	 * with no date, the quickest way to get something on the list. Who, when, repeat and a note
	 * are on the full form (/lists/tasks/new, the + in the header). Once something's typed, a
	 * link carries it over there.
	 */
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';

	interface Props {
		/** What was typed, and the problem with it, from a failed add. */
		values?: { title?: string };
		errors?: { title?: string };
	}

	let { values, errors }: Props = $props();
	let input = $state<HTMLInputElement>();
	// What's typed; a failed add from the server puts back what was sent.
	let title = $derived(values?.title ?? '');
	const more = $derived(`/lists/tasks/new?title=${encodeURIComponent(title.trim())}`);
</script>

<form
	class="task-add"
	method="POST"
	action="?/add"
	use:enhance={() =>
		async ({ result, update }) => {
			const added = result.type === 'success';
			await update({ reset: added });
			if (added) title = '';
			await tick();
			input?.focus();
		}}
>
	<div class="title-row">
		<GlassSurface radius={18} />
		<label class="visually-hidden" for="task-title">Quick add a task</label>
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
		<button class="add-button round-accent" aria-label="Add task"
			><Icon name="plus" size={20} /></button
		>
	</div>
	{#if errors?.title}<p class="field-error">{errors.title}</p>{/if}
	{#if title.trim()}
		<a class="more" href={more}>Add who, when or a repeat <Icon name="chevron" size={14} trim /></a>
	{/if}
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
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator-strong);
	}

	.title-row:focus-within {
		box-shadow:
			inset 0 0 0 var(--hairline) var(--colour-accent-separator),
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

	.more {
		display: inline-flex;
		align-items: center;
		align-self: flex-start;
		gap: 4px;
		min-height: var(--tap-target);
		margin: -10px 0 -6px;
		padding: 0 4px;
		font-size: var(--text-small);
		color: var(--colour-accent);
		text-decoration: none;
	}
</style>
