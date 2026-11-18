<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { EMPTY } from '#lib/copy/voice.js';
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	import { enhance } from '$app/forms';
	import ListCard from '#lib/features/lists/ListCard.svelte';
	import ListsNav from '#lib/features/lists/ListsNav.svelte';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Said a little differently each visit (src/lib/copy/voice.ts).
	const emptyLine = pick(EMPTY.lists);
</script>

<svelte:head>
	<title>Lists · home base</title>
</svelte:head>

<PageHeader title="Lists" />
<ListsNav />

<form class="new-list" method="POST" action="?/create" use:enhance>
	<GlassSurface radius={18} />
	<label class="visually-hidden" for="new-list-name">New list name</label>
	<input
		id="new-list-name"
		name="name"
		placeholder={PLACEHOLDERS.listName[0]}
		use:placeholderReel={PLACEHOLDERS.listName}
		autocomplete="off"
		enterkeyhint="go"
		maxlength="60"
		value={form?.name ?? ''}
		required
	/>
	<button class="add-button" aria-label="Create list"><Icon name="plus" size={20} /></button>
</form>
{#if form?.errors?.name}<p class="field-error">{form.errors.name}</p>{/if}

{#if data.lists.length === 0}
	<p class="empty">{emptyLine}</p>
{:else}
	<ul class="cards">
		{#each data.lists as list (list.id)}
			<ListCard {list} today={data.today} />
		{/each}
	</ul>
{/if}

<p class="past-link"><a class="button-quiet" href="/lists/past">Past lists</a></p>

<style>
	.new-list {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-s);
		height: 56px;
		padding: 0 6px 0 18px;
		border-radius: var(--radius-field);
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
	}

	.new-list:focus-within {
		box-shadow:
			inset 0 0 0 1px var(--colour-accent-edge),
			0 0 0 3px var(--colour-accent-soft);
	}

	.new-list input {
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

	.new-list input::placeholder {
		color: var(--colour-text-faint);
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

	.field-error {
		margin-top: var(--space-s);
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 28px 0 0;
		padding: 0;
	}

	.empty {
		margin-top: 28px;
		color: var(--colour-text-muted);
	}

	.past-link {
		margin-top: var(--space-l);
	}
</style>
