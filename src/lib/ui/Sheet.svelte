<script lang="ts">
	/**
	 * A sheet that rises from the bottom of the screen over everything, the tab bar included.
	 * A native modal <dialog>: focus stays inside, Escape and tapping the dimmed backdrop close
	 * it, and swipe gestures leave it alone. It slides up on open and back down on close.
	 */
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		children: Snippet;
	}

	let { open, title, onclose, children }: Props = $props();

	let dialog = $state<HTMLDialogElement>();
	let closing = $state(false);
	const id = `sheet-${Math.random().toString(36).slice(2, 8)}`;

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			closing = false;
			dialog.showModal();
		} else if (!open && dialog.open && !closing) {
			closing = true;
			const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
			setTimeout(
				() => {
					dialog?.close();
					closing = false;
				},
				reduced ? 0 : 220
			);
		}
	});
</script>

<dialog
	bind:this={dialog}
	class="sheet"
	class:closing
	aria-labelledby={id}
	onclose={() => open && onclose()}
	oncancel={(event) => {
		event.preventDefault();
		onclose();
	}}
	onclick={(event) => event.target === dialog && onclose()}
>
	<div class="panel">
		<header>
			<h2 {id}>{title}</h2>
			<button type="button" class="close" aria-label="Close" onclick={onclose}>
				<Icon name="close" size={20} />
			</button>
		</header>
		{@render children()}
	</div>
</dialog>

<style>
	.sheet {
		width: 100%;
		max-width: 520px;
		max-height: 90dvh;
		margin: auto auto 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--colour-text);
		overflow: visible;
	}

	.sheet::backdrop {
		background: rgb(4 3 3 / 0.55);
		animation: dim-in 260ms var(--ease-out);
	}

	.panel {
		max-height: 90dvh;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 18px var(--page-gutter) calc(env(safe-area-inset-bottom) + 22px);
		border-radius: 30px 30px 0 0;
		background: linear-gradient(180deg, rgb(34 27 23), rgb(20 16 13));
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.12),
			0 -20px 60px -20px rgb(0 0 0 / 0.8);
		animation: sheet-in 380ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.closing .panel {
		animation: sheet-out 220ms cubic-bezier(0.4, 0, 1, 1) forwards;
	}

	.closing::backdrop {
		animation: dim-out 220ms ease forwards;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-m);
		margin-bottom: var(--space-m);
	}

	h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: var(--weight-strong);
	}

	.close {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		margin-right: -8px;
		border: 0;
		border-radius: 50%;
		background: rgb(255 255 255 / 0.06);
		color: var(--colour-text-muted);
	}

	@keyframes sheet-in {
		from {
			transform: translateY(100%);
		}
	}

	@keyframes sheet-out {
		to {
			transform: translateY(100%);
		}
	}

	@keyframes dim-in {
		from {
			opacity: 0;
		}
	}

	@keyframes dim-out {
		to {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.panel,
		.sheet::backdrop {
			animation: none;
		}
	}
</style>
