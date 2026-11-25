<script lang="ts">
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
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
	const toGet = $derived(items.filter((item) => !item.checked));
	const ticked = $derived(items.filter((item) => item.checked));
	const remaining = $derived(toGet.length);
	// The Shopping list never moves to Past lists, so it has nothing to announce.
	const allTicked = $derived(!list.pinned && items.length > 0 && remaining === 0);

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
	<GlassSurface radius={18} />
	<label class="visually-hidden" for="new-item">Add to {list.name}</label>
	<input
		id="new-item"
		name="name"
		placeholder={PLACEHOLDERS.listItem[0]}
		use:placeholderReel={PLACEHOLDERS.listItem}
		autocomplete="off"
		enterkeyhint="done"
		maxlength="120"
		required
	/>
	<button class="add-button round-accent" aria-label="Add item">
		<Icon name="plus" size={20} />
	</button>
</form>
{#if message}<p class="message" role="alert">{message}</p>{/if}

{#if items.length === 0}
	<p class="summary caption-label">Nothing on this list yet.</p>
{:else}
	<p class="summary caption-label" aria-live="polite">
		{remaining === 0 ? 'All got' : `${remaining} to get`}
	</p>
{/if}

{#if toGet.length}
	<ul class="items">
		{#each toGet as item (item.id)}
			<ListItemRow
				{item}
				{editing}
				ringColour={ringColourFor(item.createdBy)}
				onoptimistic={setPending}
			/>
		{/each}
	</ul>
{/if}

<!-- Ticked things gather at the foot, as in Reminders, with Clear to take them away. -->
{#if ticked.length}
	<div class="ticked-head">
		<p class="summary caption-label">{ticked.length} ticked</p>
		<form
			method="POST"
			action="?/clearTicked"
			use:enhance={() => {
				ticked.forEach((item) => setPending(item.id, null));
				return async ({ update }) => update();
			}}
		>
			<button class="clear">Clear</button>
		</form>
	</div>
	<ul class="items done">
		{#each ticked as item (item.id)}
			<ListItemRow
				{item}
				{editing}
				ringColour={ringColourFor(item.createdBy)}
				onoptimistic={setPending}
			/>
		{/each}
	</ul>
{/if}

<style>
	.complete {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: var(--space-l);
		padding: 16px 18px;
		border-radius: var(--radius-field);
		background: var(--colour-accent-soft);
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-accent-separator);
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
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator-strong);
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
			inset 0 0 0 var(--hairline) var(--colour-accent-separator),
			0 0 0 3px var(--colour-accent-soft);
	}

	/* Above the field's glass. */
	.add-button {
		position: relative;
		z-index: 1;
	}

	.message {
		margin-top: var(--space-s);
		font-size: var(--text-caption);
		color: var(--colour-accent);
	}

	.summary {
		margin: 28px 0 var(--space-xs);
	}

	.items {
		margin: 0;
		padding: 0;
	}

	/* A hairline between rows that starts at the text, past the circle (as in Reminders). */
	.items > :global(li + li) {
		background: linear-gradient(var(--colour-separator), var(--colour-separator)) no-repeat
			calc(24px + var(--space-m)) 0 / calc(100% - 24px - var(--space-m)) var(--hairline);
	}

	.ticked-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: var(--space-l);
	}

	.ticked-head .summary {
		margin: 0;
	}

	.ticked-head form {
		margin: 0;
	}

	.clear {
		min-height: var(--tap-target);
		padding: 0 4px;
		border: 0;
		background: none;
		font: inherit;
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
		color: var(--colour-accent);
	}
</style>
