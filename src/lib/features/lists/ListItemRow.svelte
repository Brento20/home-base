<script lang="ts">
	/**
	 * One item in a list: tap the circle to tick it off, tap the name to fix it (Return saves,
	 * Escape puts it back), or remove it in edit mode.
	 */
	import { enhance } from '$app/forms';
	import Icon from '#lib/ui/Icon.svelte';
	import { save, type SaveEach } from '#lib/ui/save.svelte.js';
	import type { ListItem } from '#lib/types.js';

	interface Props {
		item: ListItem;
		/** Colour of whoever added it, used for the ring. */
		ringColour: string;
		/** Edit mode shows a remove button instead of ticking. */
		editing?: boolean;
		/** The list's ticks: each item's shows straight away (ListDetail). */
		ticks: SaveEach<boolean>;
	}

	let { item, ringColour, editing = false, ticks }: Props = $props();
	let renaming = $state(false);
	let draft = $state('');

	const removing = save();
	// The new name shows as soon as you're done typing, until the fresh list has it.
	const renamed = save<string>({
		optimistic: ({ formData }) => String(formData.get('name') ?? '').trim(),
		start: () => {
			renaming = false;
		}
	});
	const name = $derived(renamed.pending ?? item.name);

	function startRename() {
		draft = name;
		renaming = true;
	}

	function focusAndSelect(input: HTMLInputElement) {
		input.focus();
		input.select();
	}

	// Leaving the field saves a change; an empty or unchanged name just puts it back.
	function finish(event: FocusEvent) {
		const form = (event.currentTarget as HTMLInputElement).form;
		if (draft.trim() && draft.trim() !== name) form?.requestSubmit();
		else renaming = false;
	}
</script>

<li class="item-row" class:removing={removing.busy}>
	{#if editing}
		<span class="item static">
			<span class="ring" class:checked={item.checked} style:--ring-colour={ringColour}>
				{#if item.checked}<Icon name="check" size={14} />{/if}
			</span>
			<span class="name" class:checked={item.checked}>{name}</span>
		</span>
		<form method="POST" action="?/deleteItem" use:enhance={removing.enhance}>
			<input type="hidden" name="itemId" value={item.id} />
			<button class="remove" aria-label="Remove {name}"><Icon name="close" size={16} /></button>
		</form>
	{:else}
		<form method="POST" action="?/setChecked" use:enhance={ticks.for(item.id)}>
			<input type="hidden" name="itemId" value={item.id} />
			<input type="hidden" name="checked" value={String(!item.checked)} />
			<button
				class="tick"
				data-haptic
				aria-pressed={item.checked}
				aria-label={item.checked ? `Untick ${name}` : `Tick off ${name}`}
			>
				<span class="ring" class:checked={item.checked} style:--ring-colour={ringColour}>
					{#if item.checked}<Icon name="check" size={14} />{/if}
				</span>
			</button>
		</form>
		{#if renaming}
			<form class="rename" method="POST" action="?/renameItem" use:enhance={renamed.enhance}>
				<input type="hidden" name="itemId" value={item.id} />
				<input
					class="name-input"
					name="name"
					aria-label="Item name"
					maxlength="120"
					autocomplete="off"
					enterkeyhint="done"
					bind:value={draft}
					use:focusAndSelect
					onblur={finish}
					onkeydown={(event) => {
						if (event.key === 'Escape') renaming = false;
					}}
				/>
			</form>
		{:else}
			<button class="name-button" aria-label="Rename {name}" onclick={startRename}>
				<span class="name" class:checked={item.checked}>{name}</span>
			</button>
		{/if}
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

	/* Just the circle, with a full-height tap area. */
	.tick {
		display: grid;
		place-items: center start;
		width: calc(24px + var(--space-m));
		min-height: var(--row-height);
		padding: 0;
		border: 0;
		background: none;
	}

	.tick:global([data-pressed]) .ring {
		transform: scale(0.86);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}

	/* The rest of the row: tap the name to fix it. */
	.name-button {
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 0;
		min-height: var(--row-height);
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
	}

	.rename {
		display: flex;
		flex: 1;
		min-width: 0;
	}

	.name-input {
		flex: 1;
		min-width: 0;
		min-height: var(--row-height);
		padding: 0;
		border: 0;
		border-bottom: 1px solid var(--colour-accent);
		background: none;
		color: var(--colour-text);
		font-size: var(--text-body);
		outline: none;
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
		border: 2px solid var(--ring-ink);
		color: var(--colour-on-ring);
		transition:
			background-color var(--duration-quick) var(--ease-out),
			transform var(--duration-release) var(--spring-gentle);
	}

	.item:global([data-pressed]) .ring {
		transform: scale(0.86);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}

	.ring.checked {
		background: var(--ring-ink);
	}

	.name {
		font-size: var(--text-body);
		overflow-wrap: anywhere;
	}

	.name.checked {
		color: var(--colour-text-faint);
		text-decoration: line-through;
		text-decoration-color: var(--colour-strike);
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
