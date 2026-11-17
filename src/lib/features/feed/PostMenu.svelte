<script lang="ts">
	/**
	 * The ⋯ menu on a post: turn it into a plan, and for the author, delete it. Deleting takes two
	 * taps instead of a browser confirm dialog.
	 */
	import { enhance } from '$app/forms';
	import Icon from '#lib/ui/Icon.svelte';

	interface Props {
		postId: string;
		mine: boolean;
		/** Where to go after deleting (the post's own page has to leave). */
		afterDelete?: string;
	}

	let { postId, mine, afterDelete }: Props = $props();

	let open = $state(false);
	let armed = $state(false);
	let menu = $state<HTMLElement>();

	function close() {
		open = false;
		armed = false;
	}

	function onWindowPointer(event: PointerEvent) {
		if (open && menu && !menu.contains(event.target as Node)) close();
	}
</script>

<svelte:window
	onpointerdown={onWindowPointer}
	onkeydown={(event) => event.key === 'Escape' && close()}
/>

<div class="post-menu" bind:this={menu}>
	<button
		type="button"
		class="trigger"
		aria-label="Post options"
		aria-expanded={open}
		aria-haspopup="menu"
		onclick={() => (open ? close() : (open = true))}
	>
		<Icon name="more" size={20} />
	</button>

	{#if open}
		<div class="menu" role="menu">
			<a class="item" role="menuitem" href="/plans/new?post={postId}" onclick={close}>
				<Icon name="plans" size={18} /> Create event
			</a>
			{#if mine}
				<form
					method="POST"
					action="/feed/{postId}?/delete{afterDelete
						? `&then=${encodeURIComponent(afterDelete)}`
						: ''}"
					use:enhance={() => {
						return async ({ update }) => {
							close();
							// From Today, stay on Today; from the post's page, the action redirects home.
							await update({ navigate: false });
						};
					}}
				>
					<button
						class="item danger"
						role="menuitem"
						onclick={(event) => {
							if (armed) return;
							event.preventDefault();
							armed = true;
						}}
					>
						<Icon name="close" size={18} />
						{armed ? 'Tap again to delete' : 'Delete post'}
					</button>
				</form>
			{/if}
		</div>
	{/if}
</div>

<style>
	.post-menu {
		position: relative;
		z-index: 3;
	}

	.trigger {
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		margin: -10px -12px -10px 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--colour-text-muted);
	}

	.trigger:active {
		background: rgb(255 255 255 / 0.06);
	}

	.menu {
		position: absolute;
		top: calc(100% + 6px);
		right: -6px;
		min-width: 200px;
		padding: 6px;
		border-radius: 18px;
		background: rgb(28 22 19 / 0.96);
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline-strong),
			var(--shadow-lift);
		-webkit-backdrop-filter: var(--glass-blur);
		backdrop-filter: var(--glass-blur);
		transform-origin: top right;
		animation: menu-in var(--duration-settle) var(--spring-soft);
	}

	@keyframes menu-in {
		from {
			opacity: 0;
			transform: scale(0.94);
		}
	}

	form {
		margin: 0;
	}

	.item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-height: var(--tap-target);
		padding: 0 12px;
		border: 0;
		border-radius: 12px;
		background: none;
		color: var(--colour-text);
		font: inherit;
		font-size: var(--text-small);
		text-align: left;
		text-decoration: none;
	}

	.item:active {
		background: rgb(255 255 255 / 0.06);
	}

	.item :global(svg) {
		color: var(--colour-text-muted);
	}

	.danger,
	.danger :global(svg) {
		color: #f19a8f;
	}

	@media (prefers-reduced-motion: reduce) {
		.menu {
			animation: none;
		}
	}
</style>
