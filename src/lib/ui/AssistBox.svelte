<script lang="ts">
	/**
	 * An AI helper above a form: type (or snap) something, and the form below fills in for you
	 * to check and save. It's a separate little form posting to its own action, so the real form
	 * always works by hand too. When the helper can't manage, it says so with a fun line and the
	 * real form gets the focus.
	 *
	 * The page's action returns `{ assist: 'filled', ... }` or `{ assist: 'failed', ... }`;
	 * pass that as `outcome`. `photo`: 'optional' adds a photo button, 'only' is a single
	 * "Snap a receipt" style button that sends as soon as a photo is chosen.
	 */
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { pick } from '#lib/copy/pick.js';
	import { AI_OOPS } from '#lib/copy/voice.js';
	import { shrinkPhoto } from '#lib/ui/photo.js';
	import Icon from '#lib/ui/Icon.svelte';

	interface Props {
		action: string;
		/** Above the box, e.g. "Got a recipe somewhere else?" */
		label: string;
		/** The text box's placeholder. Leave out for a photo-only helper. */
		placeholder?: string;
		multiline?: boolean;
		photo?: 'none' | 'optional' | 'only';
		submitLabel: string;
		busyLabel: string;
		/** What the last try did, from the page's action. */
		outcome?: 'filled' | 'failed' | null;
		/** Shown after a fill, e.g. "Filled in from the link. Check it over, then save." */
		filledNote?: string;
		/** Where to send the focus when the helper gives up: the form's first field. */
		focusOnFail?: string;
	}

	let {
		action,
		label,
		placeholder,
		multiline = false,
		photo = 'none',
		submitLabel,
		busyLabel,
		outcome = null,
		filledNote = 'Filled in below. Check it over, then save.',
		focusOnFail
	}: Props = $props();

	let text = $state('');
	let chosen = $state<File | null>(null);
	let busy = $state(false);
	let photoProblem = $state(false);
	let form = $state<HTMLFormElement>();
	const oops = pick(AI_OOPS);
	const ready = $derived(Boolean(text.trim() || chosen));

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
		busy = true;
		return async ({ result, update }) => {
			await update({ reset: false, invalidateAll: false });
			busy = false;
			if (result.type === 'success' && result.data?.assist === 'filled') {
				text = '';
				chosen = null;
			} else if (focusOnFail) {
				await tick();
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
				<textarea name="text" rows="3" {placeholder} bind:value={text} maxlength="20000"></textarea>
			{:else}
				<input name="text" {placeholder} bind:value={text} autocomplete="off" maxlength="300" />
			{/if}
		</div>
	{/if}

	<div class="row">
		{#if photo !== 'none'}
			<label class="button-secondary photo" class:has={chosen}>
				<Icon name="camera" size={18} />
				{#if photo === 'only'}{busy ? busyLabel : submitLabel}{:else}{chosen
						? 'Photo added'
						: 'Photo'}{/if}
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
			<button class="button-secondary go" disabled={!ready || busy}>
				{#if busy}<span class="spinner" aria-hidden="true"
					></span>{busyLabel}{:else}{submitLabel}{/if}
			</button>
		{/if}
	</div>

	<p class="status" role="status">
		{#if photoProblem}That photo couldn’t be read. Try another, or fill it in below.
		{:else if outcome === 'failed' && !busy}{oops}
		{:else if outcome === 'filled' && !busy}{filledNote}{/if}
	</p>
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
		color: var(--colour-accent);
	}

	.box textarea,
	.box input {
		width: 100%;
		padding: 12px 16px;
		border: 0;
		border-radius: var(--radius-field);
		background: rgb(255 255 255 / 0.04);
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
		font-size: var(--text-body);
		line-height: 1.4;
		resize: vertical;
		outline: none;
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

	.row > * {
		flex: 1;
	}

	.photo {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		cursor: pointer;
	}

	.photo.has {
		border-color: var(--colour-accent-edge);
	}

	.photo:has(input:focus-visible) {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}

	.go {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.go:disabled {
		opacity: 0.45;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.status {
		margin: 0;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.status:empty {
		display: none;
	}
</style>
