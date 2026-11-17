<script lang="ts">
	/** Plain text with web links made tappable. No HTML is ever injected. */
	interface Props {
		text: string;
	}

	let { text }: Props = $props();

	const parts = $derived(
		text.split(/(https?:\/\/[^\s<>"']+)/g).map((part, index) => ({ part, isLink: index % 2 === 1 }))
	);
</script>

{#each parts as { part, isLink }, index (index)}{#if isLink}<a
			href={part}
			target="_blank"
			rel="noopener noreferrer">{part.replace(/^https?:\/\/(www\.)?/, '')}</a
		>{:else}{part}{/if}{/each}

<style>
	a {
		color: var(--colour-accent);
		text-decoration: underline;
		text-decoration-color: var(--colour-accent-edge);
		text-underline-offset: 3px;
		overflow-wrap: anywhere;
	}
</style>
