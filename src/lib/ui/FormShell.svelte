<script lang="ts">
	/**
	 * The frame every add and edit form shares (plans, tasks): the fields stacked with the same
	 * spacing, one save button docked above the tab bar (SaveDock) that says "Saving…" while it
	 * works, and what you typed
	 * kept if the server sends it back with a problem. Each form brings its own fields. Nothing
	 * is saved until the button is pressed, so leaving the page never leaves half a thing behind.
	 */
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { save } from '#lib/ui/save.svelte.js';
	import SaveDock from './SaveDock.svelte';

	interface Props {
		action: string;
		submitLabel: string;
		/** A class for the form, so a form's own CSS (and an AI helper's `target`) can find it. */
		class?: string;
		children: Snippet;
	}

	let { action, submitLabel, class: name = '', children }: Props = $props();
	const saving = save();
</script>

<form
	novalidate
	method="POST"
	{action}
	class="form-stack docked {name}"
	use:enhance={saving.enhance}
>
	{@render children()}

	<SaveDock label={submitLabel} saving={saving.busy} />
</form>
