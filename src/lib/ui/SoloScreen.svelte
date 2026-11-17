<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** One or two sentences under the title. */
		lead?: string;
		/** A back link or similar, above the title. */
		top?: Snippet;
		/** Quiet links under the content, e.g. "Already have an account?" */
		footer?: Snippet;
		children?: Snippet;
	}

	let { title, lead, top, footer, children }: Props = $props();
</script>

<!-- One task per screen, centred, with no tab bar: sign up, sign in, profile, build or join. -->
<main class="solo">
	<div class="column">
		{#if top}<div class="top">{@render top()}</div>{/if}
		<header>
			<h1>{title}</h1>
			{#if lead}<p class="lead">{lead}</p>{/if}
		</header>
		{@render children?.()}
		{#if footer}<footer>{@render footer()}</footer>{/if}
	</div>
</main>

<style>
	.solo {
		view-transition-name: page;
		display: flex;
		min-height: 100dvh;
		padding: calc(env(safe-area-inset-top) + 32px) var(--page-gutter)
			calc(env(safe-area-inset-bottom) + 32px);
	}

	.column {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: var(--space-l);
		width: 100%;
		max-width: 420px;
		margin: auto;
	}

	.top {
		margin: 0 0 calc(var(--space-s) * -1) -4px;
	}

	h1 {
		font-size: var(--text-event-title);
		line-height: 1.1;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		text-wrap: balance;
	}

	.lead {
		margin-top: var(--space-s);
		max-width: 34ch;
		color: var(--colour-text-muted);
		text-wrap: pretty;
	}

	footer {
		font-size: var(--text-small);
		color: var(--colour-text-muted);
		text-align: center;
	}

	footer :global(a) {
		color: var(--colour-text);
	}
</style>
