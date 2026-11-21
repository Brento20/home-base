<script lang="ts">
	/**
	 * Lists, laid out like Reminders (the heading and Lists | Tasks switch are in +layout.svelte): the Shopping list up top as a widget you can add to straight
	 * away, then your other lists as one grouped panel (a coloured circle each, what's left on the
	 * right), with New list as the panel's last row, and Past lists on its own below.
	 */
	import { enhance } from '$app/forms';
	import ShoppingCard from '#lib/features/lists/ShoppingCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { kept } from '#lib/ui/kept.svelte.js';
	import { arrive, changed, glide, leave } from '#lib/ui/motion.js';
	import Reveal from '#lib/ui/Reveal.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// The copy this phone kept until fresh data lands (src/lib/ui/kept.svelte.ts).
	const screen = kept(
		() => 'lists',
		() => data.screen
	);

	// The real sections' heights, so placeholders hold their place.
	const SHOPPING_HEIGHT = 122;
	const PANEL_HEIGHT = 177;

	// A list keeps its colour: picked from its id, not its place, so adding one repaints nothing.
	const COLOURS = 8;
	function colourOf(id: string) {
		let hash = 0;
		for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
		return `var(--chart-${(hash % COLOURS) + 1})`;
	}
</script>

<svelte:head>
	<title>Lists · home base</title>
</svelte:head>

<Reveal of={screen} placeholder={[SHOPPING_HEIGHT, PANEL_HEIGHT]} gap={32} label="Loading lists">
	{#snippet children({ lists })}
		{@const shopping = lists.find((list) => list.pinned)}
		{@const others = lists.filter((list) => !list.pinned)}
		{#if shopping}
			<ShoppingCard list={shopping} />
		{/if}

		<section class="group" aria-labelledby="my-lists">
			<h2 class="group-title" id="my-lists">My lists</h2>
			<ul class="grouped">
				{#each others as list (list.id)}
					<li
						in:arrive
						out:leave
						animate:glide
						use:changed={`${list.name}|${list.remaining}|${list.upNext.join()}`}
					>
						<a class="grouped-row" href="/lists/{list.id}">
							<span class="grouped-icon" style:--icon-colour={colourOf(list.id)}
								><Icon name="lists" size={16} /></span
							>
							<span class="grouped-label">
								{list.name}
								{#if list.upNext.length}
									<span class="grouped-sub one-line">{list.upNext.join(', ')}</span>
								{/if}
							</span>
							<span class="grouped-value" aria-label="{list.remaining} left">{list.remaining}</span>
							<span class="grouped-chevron"><Icon name="chevron" size={16} /></span>
						</a>
					</li>
				{/each}
				<li>
					<form class="grouped-row new-list" method="POST" action="?/create" use:enhance>
						<span class="grouped-icon new-icon"><Icon name="plus" size={16} /></span>
						<label class="visually-hidden" for="new-list-name">New list name</label>
						<input
							id="new-list-name"
							name="name"
							placeholder="New list"
							autocomplete="off"
							autocapitalize="sentences"
							enterkeyhint="go"
							maxlength="60"
							value={form?.name ?? ''}
							required
						/>
						<button class="create">Add</button>
					</form>
				</li>
			</ul>
			{#if form?.errors?.name}
				<p class="field-error group-error">{form.errors.name}</p>
			{:else}
				<p class="group-note">
					{others.length
						? 'A list moves to Past lists once everything on it is ticked.'
						: 'For anything that isn’t the weekly shop: a hardware run, a packing list.'}
				</p>
			{/if}
		</section>
	{/snippet}
</Reveal>

<ul class="grouped past">
	<li>
		<a class="grouped-row" href="/lists/past">
			<span class="grouped-icon" style:--icon-colour="var(--colour-fill-stronger)"
				><Icon name="archive" size={16} /></span
			>
			<span class="grouped-label">Past lists</span>
			<span class="grouped-chevron"><Icon name="chevron" size={16} /></span>
		</a>
	</li>
</ul>

<style>
	.group {
		margin-top: var(--space-xl);
	}

	/* New list: the panel's last row, an inline field with a plain Add, as in Reminders. */
	.new-list {
		margin: 0;
	}

	.new-icon {
		background: var(--colour-fill-strong);
		color: var(--colour-accent);
	}

	.new-list input {
		flex: 1;
		min-width: 0;
		min-height: 40px;
		border: 0;
		background: none;
		font-size: var(--text-body);
		color: var(--colour-text);
		outline: none;
	}

	.new-list input::placeholder {
		color: var(--colour-text-faint);
	}

	.create {
		min-height: 40px;
		padding: 0 6px;
		border: 0;
		background: none;
		font: inherit;
		font-weight: var(--weight-medium);
		color: var(--colour-accent);
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--duration-quick) var(--ease-out);
	}

	/* Add appears once there's a name to add. */
	.new-list:has(input:not(:placeholder-shown)) .create {
		opacity: 1;
		pointer-events: auto;
	}

	.group-error {
		margin: 8px 16px 0;
	}

	.past {
		margin-top: var(--space-l);
	}

	.past .grouped-icon {
		color: var(--colour-text-muted);
	}
</style>
