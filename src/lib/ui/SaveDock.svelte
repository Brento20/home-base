<script lang="ts">
	/**
	 * A long form's save button, docked above the tab bar (ActionDock) so it's always in reach
	 * instead of waiting at the foot of the form, and riding on the keyboard while you type, the
	 * way iOS puts Done over it. Put it inside the `<form>`: it's an ordinary submit button there,
	 * so the form posts with or without script. Its form gets the `docked` padding (forms.css) so
	 * the last field clears the bar.
	 */
	import ActionDock from './ActionDock.svelte';
	import { keyboardHeight } from './keyboard.svelte.js';

	interface Props {
		label: string;
		/** What it says while saving. */
		busyLabel?: string;
		saving?: boolean;
		disabled?: boolean;
	}

	let { label, busyLabel = 'Saving…', saving = false, disabled = false }: Props = $props();
	const keyboard = keyboardHeight();
</script>

<ActionDock lift={keyboard.current}>
	<button class="button-primary act save" disabled={saving || disabled}>
		{saving ? busyLabel : label}
	</button>
</ActionDock>

<style>
	.save {
		flex: 1;
	}
</style>
