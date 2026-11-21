<script lang="ts">
	/**
	 * A link that's just been made (an invite, a friend link, a house-sitter link), shown once:
	 * the link itself, Share (on phones, which have a share sheet) and Copy. The database keeps
	 * only a hash of the token, so this is the only time anyone sees it.
	 */
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		link: string;
		/** What the share sheet calls it ("Join home base on home base"). */
		title: string;
		/** For the link's box, read by screen readers. */
		label: string;
	}

	let { link, title, label }: Props = $props();
	let copied = $state(false);
	let canShare = $state(false);
	// Checked after hydration, so the server's page and the browser's agree.
	onMount(() => (canShare = typeof navigator.share === 'function'));

	// A new link starts uncopied.
	$effect(() => {
		void link;
		copied = false;
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
		} catch {
			// Clipboard refused (an old browser, or no permission): the link is selectable.
		}
	}

	async function share() {
		try {
			await navigator.share({ title, url: link });
		} catch {
			// Closed the share sheet: nothing to do.
		}
	}
</script>

<div class="share-link">
	<input
		class="field-input link"
		readonly
		value={link}
		aria-label={label}
		onfocus={(event) => event.currentTarget.select()}
	/>
	<div class="actions">
		{#if canShare}
			<button class="button-secondary" type="button" onclick={share}>
				<Icon name="share" size={17} /> Share
			</button>
		{/if}
		<button class="button-secondary" type="button" onclick={copy}>
			{copied ? 'Copied' : 'Copy link'}
		</button>
	</div>
	<p class="field-hint">You won’t see this link again, so send it now.</p>
</div>

<style>
	.share-link {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
		margin-top: var(--space-m);
		padding-top: var(--space-m);
		border-top: 1px solid var(--colour-hairline);
	}

	.link {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: var(--text-small);
	}

	.actions {
		display: flex;
		gap: var(--space-s);
	}

	.actions > * {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}
</style>
