<script lang="ts">
	/**
	 * The add bar on Today, sitting on top of the Coming up row it feeds and as wide as its
	 * cards. Type, and the choices appear in a toolbar riding on the keyboard (the ActionDock,
	 * above the tab bar once the keyboard's down), the way iOS puts actions over the keyboard,
	 * so the field keeps its full width and nothing on the page moves:
	 * - Add task (or Return): added straight away, for anyone, no date, with Undo.
	 * - Make it a plan: the words go to New plan, where a day and time get set.
	 */
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import ActionDock from '#lib/ui/ActionDock.svelte';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { keyboardHeight } from '#lib/ui/keyboard.svelte.js';

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
	const keyboard = keyboardHeight();

	async function clear() {
		text = '';
		await tick();
		input?.focus();
	}
</script>

<form
	id="add-bar-form"
	class="add-bar"
	class:cards
	class:typed
	method="POST"
	action="?/addTask"
	aria-label="New task or plan"
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
		<label class="visually-hidden" for="add-bar">New task or plan</label>
		<input
			bind:this={input}
			id="add-bar"
			name="title"
			placeholder="New task or plan"
			autocomplete="off"
			enterkeyhint="done"
			maxlength="160"
			bind:value={text}
			aria-invalid={errors?.title ? 'true' : undefined}
			aria-describedby={errors?.title ? 'add-bar-error' : undefined}
			required
		/>
		{#if text}
			<!-- iOS's clear button: there while there's something to clear. -->
			<button type="button" class="clear" aria-label="Clear" onclick={clear}
				><Icon name="close" size={14} /></button
			>
		{/if}
	</div>
	{#if errors?.title}<p class="field-error" id="add-bar-error">{errors.title}</p>{/if}
</form>

{#if typed}
	<!-- Outside the form (it's fixed to the screen), tied back to it by `form`. -->
	<ActionDock lift={keyboard.current}>
		<a class="button-secondary act add-bar-act" href={planHref} aria-label="Make “{typed}” a plan"
			>Make it a plan</a
		>
		<button
			class="button-primary act add-bar-act"
			form="add-bar-form"
			aria-label="Add “{typed}” as a task"
			disabled={saving}>Add task</button
		>
	</ActionDock>
{/if}

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
		gap: 8px;
		height: 48px;
		padding: 0 4px 0 14px;
		border-radius: var(--radius-field);
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
		transition: box-shadow var(--duration-quick) var(--ease-out);
	}

	/* Focus shows as the edge turning accent, as an iOS field does, without a halo. */
	.bar:focus-within {
		box-shadow: inset 0 0 0 1px var(--colour-accent-edge);
	}

	.lead,
	input,
	.clear {
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

	/* A small filled circle with a cross, in a full 44px target. */
	.clear {
		display: grid;
		flex: none;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		padding: 0;
		border: 0;
		background: none;
		color: var(--colour-on-ring);
	}

	.clear > :global(svg) {
		box-sizing: content-box;
		padding: 3px;
		border-radius: 50%;
		background: var(--colour-text-faint);
	}

	/* Two even halves in the dock. */
	:global(.add-bar-act) {
		flex: 1;
		justify-content: center;
		text-decoration: none;
	}

	.field-error {
		margin: 6px 0 0 14px;
	}
</style>
