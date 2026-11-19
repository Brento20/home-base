<script lang="ts">
	/** One home note as a glass card. Tap the title to edit; secret notes stay hidden until Show. */
	import LinkedText from '#lib/features/plans/LinkedText.svelte';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { HomeNote } from '#lib/types.js';

	interface Props {
		note: HomeNote;
	}

	let { note }: Props = $props();

	let revealed = $state(false);
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(note.body);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 1800);
		} catch {
			// Clipboard blocked (not HTTPS, or no tap): reveal it so it can be selected instead.
			revealed = true;
		}
	}
</script>

<article class="note" aria-labelledby="note-{note.id}">
	<GlassSurface radius={24} />
	<div class="body">
		<a class="title" id="note-{note.id}" href="/home/notes/{note.id}">
			<span>{note.title}</span>
			<Icon name="chevron" size={18} />
		</a>

		{#if note.body}
			{#if note.isSecret && !revealed}
				<p class="text hidden" aria-label="Hidden">••••••••••</p>
			{:else}
				<p class="text"><LinkedText text={note.body} /></p>
			{/if}

			<div class="actions">
				{#if note.isSecret}
					<button type="button" class="action" onclick={() => (revealed = !revealed)}>
						{revealed ? 'Hide' : 'Show'}
					</button>
				{/if}
				<button type="button" class="action" onclick={copy} aria-live="polite">
					{copied ? 'Copied' : 'Copy'}
				</button>
			</div>
		{/if}
	</div>
</article>

<style>
	.note {
		position: relative;
		border-radius: var(--radius-tile);
	}

	.body {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px 18px 12px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
	}

	.title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-s);
		min-height: var(--tap-target);
		margin: -6px 0;
		font-weight: var(--weight-strong);
		color: inherit;
		text-decoration: none;
	}

	.title :global(.icon) {
		flex: none;
		color: var(--colour-text-faint);
	}

	.text {
		font-size: var(--text-small);
		line-height: 1.45;
		color: var(--colour-text-muted);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		user-select: text;
	}

	.hidden {
		letter-spacing: 0.12em;
	}

	.actions {
		display: flex;
		gap: var(--space-s);
		margin: -2px -10px -8px;
	}

	.action {
		min-height: var(--tap-target);
		padding: 0 10px;
		border: 0;
		border-radius: var(--radius-pill);
		background: none;
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		color: var(--colour-accent);
	}

	.action:global([data-pressed]) {
		background: var(--colour-accent-soft);
	}
</style>
