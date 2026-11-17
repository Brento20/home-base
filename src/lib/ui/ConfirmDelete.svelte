<script lang="ts">
	/** A delete button that needs two taps, instead of a browser confirm dialog. */
	import { enhance } from '$app/forms';

	interface Props {
		/** Form action, e.g. "?/delete". */
		action: string;
		label?: string;
	}

	let { action, label = 'Delete' }: Props = $props();

	// Two taps instead of a browser confirm dialog: the first arms it, the second deletes.
	let armed = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function arm(event: MouseEvent) {
		if (armed) return;
		event.preventDefault();
		armed = true;
		clearTimeout(timer);
		timer = setTimeout(() => (armed = false), 4000);
	}
</script>

<form method="POST" {action} use:enhance>
	<button class="delete" class:armed onclick={arm} aria-live="polite">
		{armed ? 'Tap again to delete' : label}
	</button>
</form>

<style>
	form {
		margin: 0;
	}

	.delete {
		min-height: var(--tap-target);
		padding: 0 4px;
		border: 0;
		background: none;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
		transition: color var(--duration-quick) var(--ease-out);
	}

	.armed {
		color: var(--colour-accent);
		font-weight: var(--weight-medium);
	}
</style>
