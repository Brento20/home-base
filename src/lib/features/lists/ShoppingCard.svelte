<script lang="ts">
	/**
	 * The home's Shopping list as a widget: what's still to get at a glance, and a field to add to
	 * it on the go without opening it (Today and the top of Lists). Adding keeps the keyboard up
	 * for the next thing, the way Reminders does, and the count line says "Added …" for a moment. The card's
	 * header opens the full list.
	 */
	import { enhance } from '$app/forms';
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	import type { ListSummary } from '#lib/types.js';

	interface Props {
		list: ListSummary;
	}

	let { list }: Props = $props();

	let input = $state<HTMLInputElement>();
	let added = $state<string[]>([]);
	let message = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Names just added show straight away, until the fresh data arrives with them in.
	const upNext = $derived([...added, ...list.upNext]);
	const toGet = $derived(list.remaining + added.length);

	// One line under the name: how many, then what (cut off with … when it runs long).
	const countText = $derived(
		toGet === 0 ? 'Nothing to get' : `${toGet} to get · ${upNext.slice(0, 4).join(', ')}`
	);
</script>

<section class="shopping" aria-labelledby="shopping-{list.id}">
	<GlassSurface radius={24} />
	<div class="body">
		<a class="head" href="/lists/{list.id}">
			<span class="icon"><Icon name="basket" size={19} /></span>
			<span class="title">
				<span class="name" id="shopping-{list.id}">{list.name}</span>
				<span class="count" class:said={message}>{message || countText}</span>
			</span>
			<span class="chevron"><Icon name="chevron" size={18} /></span>
		</a>

		<form
			class="quick-add"
			method="POST"
			action="/lists/{list.id}?/add"
			use:enhance={({ formData, cancel }) => {
				const name = String(formData.get('name') ?? '').trim();
				if (!name) {
					cancel();
					return;
				}
				added = [name, ...added];
				if (input) input.value = '';
				return async ({ result, update }) => {
					if (result.type === 'failure' || result.type === 'error') {
						added = added.filter((entry) => entry !== name);
						if (input) input.value = name;
						message = 'That didn’t add. Try again?';
					} else if (result.type === 'success' && result.data?.already) {
						message = `${name} is already on the list`;
					} else {
						message = `Added ${name}`;
					}
					clearTimeout(timer);
					timer = setTimeout(() => (message = ''), 2000);
					// Stay put (this posts to the list's page) and keep the keyboard up.
					await update({ reset: false, invalidateAll: true, navigate: false });
					// The fresh data has it now (or it failed): stop showing our own copy.
					added = added.filter((entry) => entry !== name);
					input?.focus();
				};
			}}
		>
			<label class="visually-hidden" for="quick-add-{list.id}">Add to {list.name}</label>
			<input
				bind:this={input}
				id="quick-add-{list.id}"
				name="name"
				placeholder={PLACEHOLDERS.listItem[0]}
				use:placeholderReel={PLACEHOLDERS.listItem}
				autocomplete="off"
				autocapitalize="sentences"
				enterkeyhint="done"
				maxlength="120"
			/>
			<button class="add" aria-label="Add to {list.name}"><Icon name="plus" size={18} /></button>
		</form>
		<p class="visually-hidden" aria-live="polite">{message}</p>
	</div>
</section>

<style>
	.shopping {
		position: relative;
		border-radius: 24px;
	}

	.body {
		position: relative;
		z-index: 1;
		padding: 6px 12px 12px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
	}

	.head {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 54px;
		margin-bottom: 6px;
		padding: 0 2px;
		color: inherit;
		text-decoration: none;
	}

	.icon {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		flex: none;
		border-radius: 50%;
		background: var(--colour-accent);
		color: var(--colour-on-accent);
	}

	.title {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}

	.name {
		font-weight: var(--weight-strong);
	}

	.count {
		overflow: hidden;
		font-size: var(--text-caption);
		text-overflow: ellipsis;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		color: var(--colour-text-muted);
	}

	.chevron {
		display: inline-flex;
		color: var(--colour-text-faint);
	}

	/* A pill field inside the card, like a search field on iOS. */
	.quick-add {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 44px;
		margin: 0;
		padding: 0 4px 0 14px;
		border-radius: 999px;
		background: var(--colour-well);
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
	}

	.quick-add:focus-within {
		box-shadow:
			inset 0 0 0 1px var(--colour-accent-edge),
			0 0 0 3px var(--colour-accent-soft);
	}

	.quick-add input {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: 0;
		background: none;
		font-size: var(--text-body);
		color: var(--colour-text);
		outline: none;
	}

	.quick-add input::placeholder {
		color: var(--colour-text-faint);
	}

	.add {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		flex: none;
		border: 0;
		border-radius: 50%;
		background: var(--colour-accent);
		color: var(--colour-on-accent);
		transition: transform var(--duration-release) var(--spring-gentle);
	}

	.add:global([data-pressed]) {
		transform: scale(0.88);
		transition-duration: var(--duration-press);
	}

	/* A tap target bigger than the circle looks. */
	.add {
		position: relative;
	}

	.add::after {
		content: '';
		position: absolute;
		inset: -4px;
	}

	.count.said {
		color: var(--colour-accent);
	}
</style>
