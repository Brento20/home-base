<script lang="ts">
	/** A list's items and the add-item field. Ticks show straight away; the server catches up. */
	import { enhance } from '$app/forms';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { Profile, ShoppingList } from '#lib/types.js';
	import ListItemRow from './ListItemRow.svelte';

	interface Props {
		list: ShoppingList;
		people: Profile[];
		editing: boolean;
		message?: string;
	}

	let { list, people, editing, message }: Props = $props();

	// Ticks shown instantly while the server confirms.
	let pending = $state<Record<string, boolean>>({});

	const items = $derived(
		list.items
			.map((item) => (item.id in pending ? { ...item, checked: pending[item.id] } : item))
			.sort((a, b) => Number(a.checked) - Number(b.checked))
	);
	const remaining = $derived(items.filter((item) => !item.checked).length);
	const allTicked = $derived(items.length > 0 && remaining === 0);

	function setPending(id: string, checked: boolean | null) {
		if (checked === null) delete pending[id];
		else pending[id] = checked;
	}

	const ringColourFor = (createdBy: string | null) =>
		people.find((person) => person.id === createdBy)?.accentColour ?? 'var(--colour-text-faint)';
</script>

{#if allTicked}
	<div class="complete" role="status">
		<p class="complete-title">All done</p>
		<p class="complete-text">
			This list has moved to Past lists. Untick or add an item to bring it back.
		</p>
		<a class="button-quiet complete-link" href="/lists">Back to lists</a>
	</div>
{/if}

<form
	class="add"
	method="POST"
	action="?/add"
	use:enhance={() =>
		async ({ update }) => {
			await update({ reset: true });
		}}
>
	<GlassSurface radius={18} bezel={0.4} refraction={20} />
	<label class="visually-hidden" for="new-item">Add to {list.name}</label>
	<input
		id="new-item"
		name="name"
		placeholder="Add an item"
		autocomplete="off"
		enterkeyhint="done"
		maxlength="120"
		required
	/>
	<button class="add-button" aria-label="Add item">
		<Icon name="plus" size={20} />
	</button>
</form>
{#if message}<p class="message" role="alert">{message}</p>{/if}

{#if items.length === 0}
	<p class="summary">Nothing on this list yet.</p>
{:else}
	<p class="summary" aria-live="polite">
		{remaining === 0 ? 'All ticked' : `${remaining} of ${items.length} to get`}
	</p>
{/if}

<ul class="items">
	{#each items as item (item.id)}
		<ListItemRow
			{item}
			{editing}
			ringColour={ringColourFor(item.createdBy)}
			onoptimistic={setPending}
		/>
	{/each}
</ul>

<style>
	.complete {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: var(--space-l);
		padding: 16px 18px;
		border-radius: var(--radius-field);
		background: var(--colour-accent-soft);
		box-shadow: inset 0 0 0 1px var(--colour-accent-edge);
	}

	.complete-title {
		font-weight: var(--weight-strong);
		color: var(--colour-accent);
	}

	.complete-text {
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.complete-link {
		align-self: flex-start;
		margin: 2px 0 -10px -4px;
		color: var(--colour-text);
	}

	.add {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-s);
		height: 56px;
		padding: 0 6px 0 18px;
		border-radius: var(--radius-field);
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
	}

	.add input[name='name'] {
		position: relative;
		z-index: 1;
		flex: 1;
		min-width: 0;
		height: 100%;
		border: 0;
		background: none;
		font-size: var(--text-body);
		outline: none;
	}

	.add input::placeholder {
		color: var(--colour-text-faint);
	}

	.add:focus-within {
		box-shadow:
			inset 0 0 0 1px var(--colour-accent-edge),
			0 0 0 3px var(--colour-accent-soft);
	}

	.add-button {
		position: relative;
		z-index: 1;
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		border: 0;
		border-radius: 50%;
		background: var(--colour-accent);
		color: var(--colour-on-accent);
	}

	.add-button:active {
		transform: scale(0.94);
	}

	.message {
		margin-top: var(--space-s);
		font-size: var(--text-caption);
		color: var(--colour-accent);
	}

	.summary {
		margin: 28px 0 var(--space-xs);
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	.items {
		margin: 0;
		padding: 0;
	}
</style>
