<script lang="ts">
	/**
	 * An AI helper above a form: type (or snap) something, and the form below fills in for you
	 * to check and save. It's a separate little form posting to its own action, so the real form
	 * always works by hand too.
	 *
	 * Following Apple's guidance for generative features: it's marked as AI (the spectrum sparkle
	 * and the word), says specifically what it's doing while it works, shows which fields it
	 * filled (the spectrum ring, ai.css), reminds you to check them, and offers Undo. When it
	 * can't manage, it says so with a fun line and the real form gets the focus.
	 *
	 * The page's action returns `{ assist: 'filled', ... }` or `{ assist: 'failed', ... }`;
	 * pass that as `outcome`, and the real form's selector as `target`. `photo`: 'optional' adds
	 * a photo button, 'only' is a single "Scan a receipt" style button that sends as soon as a
	 * photo is chosen.
	 */
	import { onMount, tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { pick } from '#lib/copy/pick.js';
	import { AI_OOPS } from '#lib/copy/voice.js';
	import { clearFilled, markFilled, restore, snapshot, type Snapshot } from '#lib/ui/ai-fill.js';
	import { shrinkPhoto } from '#lib/ui/photo.js';
	import Icon from '#lib/ui/Icon.svelte';

	interface Props {
		action: string;
		/** The form it fills, e.g. '.recipe-form'. */
		target: string;
		/** Above the box, e.g. "Got a recipe somewhere else?" */
		label: string;
		/** The text box's placeholder. Leave out for a photo-only helper. */
		placeholder?: string;
		multiline?: boolean;
		photo?: 'none' | 'optional' | 'only';
		submitLabel: string;
		/** What it says while working on typed text, e.g. "Reading your recipe…". */
		busyLabel: string;
		/** What it says while reading a photo. */
		photoBusyLabel?: string;
		/** What it says while reading a pasted link. */
		linkBusyLabel?: string;
		/** What the last try did, from the page's action. */
		outcome?: 'filled' | 'failed' | null;
		/** Shown after a fill, e.g. "Filled in from the link." */
		filledNote?: string;
		/** Where to send the focus when the helper gives up: the form's first field. */
		focusOnFail?: string;
		/** Words to start with, e.g. what was typed on Today's add bar. */
		initial?: string;
		/** Read `initial` as soon as the page opens, without waiting for a tap. */
		autostart?: boolean;
	}

	let {
		action,
		target,
		label,
		placeholder,
		multiline = false,
		photo = 'none',
		submitLabel,
		busyLabel,
		photoBusyLabel = 'Reading your photo…',
		linkBusyLabel = 'Reading the page…',
		outcome = null,
		filledNote = 'Filled in with AI.',
		focusOnFail,
		initial = '',
		autostart = false
	}: Props = $props();

	let text = $state(untrack(() => initial));
	let chosen = $state<File | null>(null);
	let busy = $state(false);
	let photoProblem = $state(false);
	let filled = $state(0);
	let form = $state<HTMLFormElement>();
	let before: Snapshot | null = null;
	const oops = pick(AI_OOPS);
	const ready = $derived(Boolean(text.trim() || chosen));
	const working = $derived(
		chosen ? photoBusyLabel : /^https?:\/\/\S+$/i.test(text.trim()) ? linkBusyLabel : busyLabel
	);
	const targetForm = () => document.querySelector<HTMLFormElement>(target);

	async function choose(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		photoProblem = false;
		chosen = null;
		if (!file) return;
		try {
			chosen = await shrinkPhoto(file);
		} catch {
			photoProblem = true;
			return;
		}
		if (photo === 'only') form?.requestSubmit();
	}

	// Once, on opening: a page that brings words with it reads them straight away.
	onMount(() => {
		if (autostart && text.trim()) form?.requestSubmit();
	});

	/** Back to how the form was before the fill: the page drops the result, then the snapshot. */
	async function undo() {
		const saved = before;
		clearFilled(targetForm());
		await goto(page.url.pathname + page.url.search, { replace: true, reset: false });
		await tick();
		if (saved) restore(targetForm(), saved);
		clearFilled(targetForm());
		filled = 0;
		before = null;
	}
</script>

<form
	bind:this={form}
	class="assist"
	method="POST"
	{action}
	enctype="multipart/form-data"
	use:enhance={({ formData, cancel }) => {
		if (!ready) return cancel();
		formData.delete('photo');
		if (chosen) formData.set('photo', chosen);
		before = snapshot(targetForm());
		busy = true;
		filled = 0;
		return async ({ result, update }) => {
			await update({ reset: false, invalidateAll: false });
			await tick();
			busy = false;
			if (result.type === 'success' && result.data?.assist === 'filled') {
				text = '';
				chosen = null;
				filled = markFilled(targetForm(), before ?? new Map());
			} else if (focusOnFail) {
				document.querySelector<HTMLElement>(focusOnFail)?.focus({ preventScroll: true });
			}
		};
	}}
	aria-busy={busy}
>
	<p class="label"><Icon name="sparkle" size={16} /> {label}</p>

	{#if photo !== 'only'}
		<div class="box">
			{#if multiline}
				<textarea
					name="text"
					rows="3"
					aria-label={label}
					{placeholder}
					bind:value={text}
					maxlength="20000"></textarea>
			{:else}
				<input
					name="text"
					aria-label={label}
					{placeholder}
					bind:value={text}
					autocomplete="off"
					maxlength="300"
				/>
			{/if}
		</div>
	{/if}

	<div class="row">
		{#if photo !== 'none'}
			<label
				class="button-secondary photo"
				class:has={chosen}
				class:ai-busy={busy && photo === 'only'}
				class:tucked={busy && photo === 'optional'}
				aria-label={busy && photo === 'optional' ? (chosen ? 'Photo added' : 'Photo') : undefined}
			>
				<Icon name={photo === 'only' ? 'sparkle' : 'camera'} size={18} />
				<span class="text"
					>{#if photo === 'only'}{busy ? working : submitLabel}{:else}{chosen
							? 'Photo added'
							: 'Photo'}{/if}</span
				>
				<input
					class="visually-hidden"
					type="file"
					accept="image/*"
					onchange={choose}
					disabled={busy}
				/>
			</label>
		{/if}
		{#if photo !== 'only'}
			<button class="button-secondary go" class:ai-busy={busy} disabled={!ready || busy}>
				<Icon name="sparkle" size={18} />
				<span class="text">{busy ? working : submitLabel}</span>
			</button>
		{/if}
	</div>

	<div class="status" role="status">
		{#if photoProblem}
			<p>That photo couldn’t be read. Try another, or fill it in below.</p>
		{:else if outcome === 'failed' && !busy}
			<p>{oops}</p>
		{:else if outcome === 'filled' && !busy}
			<p>
				{filledNote}
				{filled ? 'The glowing fields are the ones it filled.' : ''} AI can get things wrong, so check
				it over before saving.
			</p>
			<button type="button" class="undo" onclick={undo}>Undo</button>
		{/if}
	</div>
</form>

<style>
	.assist {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
		margin-bottom: var(--space-l);
		padding-bottom: var(--space-l);
		border-bottom: 1px solid var(--colour-hairline);
	}

	.label {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		margin: 0;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.label :global(svg) {
		flex: none;
		margin-top: 2px;
	}

	.box textarea,
	.box input {
		width: 100%;
		padding: 12px 16px;
		border: 0;
		border-radius: var(--radius-field);
		background: var(--colour-press);
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
		font-size: var(--text-body);
		line-height: 1.4;
		resize: vertical;
		outline: none;
	}

	/* On light, the same white well as every other field, so it doesn't read as disabled. */
	:global([data-mode='light']) .box textarea,
	:global([data-mode='light']) .box input {
		background: var(--colour-well);
	}

	.box input {
		min-height: 52px;
	}

	.box textarea:focus,
	.box input:focus {
		box-shadow:
			inset 0 0 0 1px var(--colour-accent-edge),
			0 0 0 3px var(--colour-accent-soft);
	}

	.row {
		display: flex;
		gap: var(--space-s);
	}

	/*
	 * The buttons share the row and can never push it wider than the screen: a long "Reading
	 * the cookbook page…" gets the room (the photo button shrinks to its icon while it works)
	 * and trims with an ellipsis if it still doesn't fit.
	 */
	.row > * {
		flex: 1 1 0;
		min-width: 0;
	}

	.photo,
	.go {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 0 18px;
		white-space: nowrap;
	}

	.text {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.photo.tucked {
		flex: 0 0 auto;
		width: 50px;
		padding: 0;
	}

	.photo.tucked .text {
		display: none;
	}

	.photo {
		cursor: pointer;
	}

	.photo.has {
		border-color: var(--colour-accent-edge);
	}

	.photo:has(input:focus-visible) {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}

	/* Dimmed until there's something to read; full strength (and glowing) while it works. */
	.go:disabled:not(.ai-busy) {
		opacity: 0.45;
	}

	.status {
		display: flex;
		align-items: flex-start;
		gap: var(--space-m);
	}

	.status:empty {
		display: none;
	}

	.status p {
		flex: 1;
		margin: 0;
		font-size: var(--text-small);
		line-height: 1.45;
		color: var(--colour-text-muted);
	}

	.undo {
		flex: none;
		min-height: var(--tap-target);
		margin: -10px 0;
		padding: 0 4px;
		border: 0;
		background: none;
		color: var(--colour-text);
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
	}
</style>
