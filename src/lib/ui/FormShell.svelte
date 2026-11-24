<script lang="ts">
	/**
	 * The frame every add and edit form shares (plans, tasks): the fields stacked with the same
	 * spacing, one save button at the foot that says "Saving…" while it works, and what you typed
	 * kept if the server sends it back with a problem. Each form brings its own fields. Nothing
	 * is saved until the button is pressed, so leaving the page never leaves half a thing behind.
	 */
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';

	interface Props {
		action: string;
		submitLabel: string;
		/** A class for the form, so a form's own CSS (and an AI helper's `target`) can find it. */
		class?: string;
		children: Snippet;
	}

	let { action, submitLabel, class: name = '', children }: Props = $props();
	let saving = $state(false);
</script>

<form
	novalidate
	method="POST"
	{action}
	class="form-stack {name}"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	{@render children()}

	<div class="form-actions">
		<button class="button-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
	</div>
</form>
