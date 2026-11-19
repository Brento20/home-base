<script lang="ts">
	/**
	 * A short-lived message just above the tab bar after something leaves the screen, with Undo:
	 * "Ticked off: Descale the kettle · Undo". It goes after a few seconds on its own. Undo posts
	 * to the page's own action with the given hidden fields, so it works like any other form.
	 * Pass a new `key` each time (the thing's id) so a second tick restarts it.
	 */
	import { onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import Icon from '#lib/ui/Icon.svelte';

	interface Props {
		message: string;
		/** Changes each time, so the toast restarts. */
		key: string;
		action: string;
		fields: Record<string, string>;
		/** How long it stays, in ms. */
		duration?: number;
	}

	let { message, key, action, fields, duration = 6000 }: Props = $props();
	let shown = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		void key;
		shown = true;
		clearTimeout(timer);
		timer = setTimeout(() => (shown = false), duration);
	});

	onDestroy(() => clearTimeout(timer));
</script>

{#if shown}
	<div class="undo-toast" role="status" data-still="undo-toast">
		<Icon name="check" size={16} />
		<span class="message">{message}</span>
		<form
			method="POST"
			{action}
			use:enhance={() => {
				shown = false;
				return async ({ update }) => update({ reset: false });
			}}
		>
			{#each Object.entries(fields) as [name, value] (name)}
				<input type="hidden" {name} {value} />
			{/each}
			<button class="undo">Undo</button>
		</form>
	</div>
{/if}

<style>
	/* Where the ActionDock sits: just above the tab bar. */
	.undo-toast {
		position: fixed;
		left: 50%;
		bottom: calc(env(safe-area-inset-bottom) + 12px + 62px + 12px);
		z-index: 29;
		display: flex;
		align-items: center;
		gap: 10px;
		width: min(calc(100% - 2 * var(--page-gutter)), 420px);
		min-height: 46px;
		padding: 0 4px 0 16px;
		border-radius: var(--radius-pill);
		/* The same look as the recipe page's "Tonight · You're cooking" notice. */
		background: rgb(36 30 26 / 0.98);
		box-shadow:
			inset 0 0 0 1px rgb(255 255 255 / 0.1),
			0 10px 28px -12px rgb(0 0 0 / 0.7);
		transform: translateX(-50%);
		animation: rise var(--duration-move, 280ms) var(--ease-out) both;
	}

	.undo-toast > :global(svg) {
		flex: none;
		color: var(--colour-accent);
	}

	.message {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		font-size: var(--text-small);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	form {
		margin: 0;
	}

	.undo {
		min-width: var(--tap-target);
		min-height: var(--tap-target);
		padding: 0 12px;
		border: 0;
		border-radius: var(--radius-pill);
		background: none;
		color: var(--colour-accent);
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translate(-50%, 12px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.undo-toast {
			animation: none;
		}
	}
</style>
