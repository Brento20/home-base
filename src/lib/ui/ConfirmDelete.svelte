<script lang="ts">
	/**
	 * The one way things are deleted: a quiet button at the foot of the thing's own page, under a
	 * hairline, that needs two taps instead of a browser confirm dialog. Lists, tasks, plans,
	 * notes, recipes, expenses and repayments all use it, so deleting feels the same everywhere.
	 */
	import { enhance } from '$app/forms';

	interface Props {
		/** Form action, e.g. "?/delete". */
		action: string;
		label?: string;
		/** What the armed button says. */
		confirmLabel?: string;
	}

	let { action, label = 'Delete', confirmLabel = 'Tap again to delete' }: Props = $props();

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

<form class="confirm-delete" method="POST" {action} use:enhance>
	<button class="delete" class:armed onclick={arm} aria-live="polite">
		{armed ? confirmLabel : label}
	</button>
</form>

<style>
	.confirm-delete {
		margin: var(--space-xl) 0 0;
		padding-top: var(--space-m);
		border-top: var(--hairline) solid var(--colour-separator);
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
