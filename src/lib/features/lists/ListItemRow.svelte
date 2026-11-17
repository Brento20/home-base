<script lang="ts">
	/** One item in a list: tap to tick it off, or remove it in edit mode. */
	import { enhance } from '$app/forms';
	import Icon from '#lib/ui/Icon.svelte';
	import type { ListItem } from '#lib/types.js';

	interface Props {
		item: ListItem;
		/** Colour of whoever added it, used for the ring. */
		ringColour: string;
		/** Edit mode shows a remove button instead of ticking. */
		editing?: boolean;
		onoptimistic: (id: string, checked: boolean | null) => void;
	}

	let { item, ringColour, editing = false, onoptimistic }: Props = $props();
	let removing = $state(false);
</script>

<li class="item-row" class:removing>
	{#if editing}
		<span class="item static">
			<span class="ring" class:checked={item.checked} style:--ring-colour={ringColour}>
				{#if item.checked}<Icon name="check" size={14} />{/if}
			</span>
			<span class="name" class:checked={item.checked}>{item.name}</span>
		</span>
		<form
			method="POST"
			action="?/deleteItem"
			use:enhance={() => {
				removing = true;
				return async ({ update }) => {
					await update({ reset: false });
					removing = false;
				};
			}}
		>
			<input type="hidden" name="itemId" value={item.id} />
			<button class="remove" aria-label="Remove {item.name}"><Icon name="close" size={16} /></button
			>
		</form>
	{:else}
		<form
			method="POST"
			action="?/setChecked"
			use:enhance={() => {
				onoptimistic(item.id, !item.checked);
				return async ({ update }) => {
					await update({ reset: false });
					onoptimistic(item.id, null);
				};
			}}
		>
			<input type="hidden" name="itemId" value={item.id} />
			<input type="hidden" name="checked" value={String(!item.checked)} />
			<button class="item" aria-pressed={item.checked}>
				<span class="ring" class:checked={item.checked} style:--ring-colour={ringColour}>
					{#if item.checked}<Icon name="check" size={14} />{/if}
				</span>
				<span class="name" class:checked={item.checked}>{item.name}</span>
			</button>
		</form>
	{/if}
</li>

<style>
	.item-row {
		display: flex;
		align-items: center;
		list-style: none;
		transition: opacity var(--duration-quick) var(--ease-out);
	}

	.removing {
		opacity: 0.4;
	}

	form {
		margin: 0;
	}

	.item-row > form:only-child {
		flex: 1;
	}

	.item {
		display: flex;
		align-items: center;
		gap: var(--space-m);
		width: 100%;
		min-height: var(--row-height);
		padding: 0;
		border: 0;
		background: none;
		text-align: left;
	}

	.static {
		flex: 1;
		min-width: 0;
	}

	.ring {
		display: grid;
		place-items: center;
		flex: none;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid var(--ring-colour);
		color: #14100d;
		transition:
			background-color var(--duration-quick) var(--ease-out),
			transform var(--duration-quick) var(--ease-spring);
	}

	.item:active .ring {
		transform: scale(0.88);
	}

	.ring.checked {
		background: var(--ring-colour);
	}

	.name {
		font-size: var(--text-body);
		overflow-wrap: anywhere;
	}

	.name.checked {
		color: var(--colour-text-faint);
		text-decoration: line-through;
		text-decoration-color: rgb(245 237 230 / 0.3);
	}

	.remove {
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		margin-right: -10px;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--colour-text-muted);
	}
</style>
