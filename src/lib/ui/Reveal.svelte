<script lang="ts" generics="T">
	/**
	 * One part of a screen that streams in (src/lib/ui/kept.svelte.ts): the kept copy or fresh
	 * data when there is some, otherwise placeholders sized like the real thing, or a line saying
	 * it couldn't load. When placeholders turn into content, the content cascades in the way a
	 * whole screen does on arrival.
	 *
	 *   <Reveal of={screen} placeholder={[214, 219]}>
	 *     {#snippet children(today)} ...sections... {/snippet}
	 *   </Reveal>
	 */
	import { tick, untrack, type Snippet } from 'svelte';
	import type { Kept } from './kept.svelte.js';
	import { reveal } from './page-transitions.js';
	import Placeholder from './Placeholder.svelte';

	interface Props {
		of: Kept<T | null>;
		/** Height of each placeholder block, in pixels. */
		placeholder: number[];
		radius?: number;
		/** Space between placeholder blocks: match the gap between the real sections. */
		gap?: number;
		label?: string;
		failed?: string;
		children: Snippet<[T]>;
	}

	let {
		of: screen,
		placeholder,
		radius,
		gap,
		label = 'Loading',
		failed = 'Couldn’t load this. Pull down to try again.',
		children
	}: Props = $props();

	let root = $state<HTMLElement>();
	let hadContent = untrack(() => screen.current != null);
	$effect(() => {
		if (screen.current == null || hadContent) return;
		hadContent = true;
		tick().then(() => reveal(root ?? null));
	});
</script>

<div class="reveal" bind:this={root}>
	{#if screen.current != null}
		{@render children(screen.current)}
	{:else if screen.failed}
		<p class="failed">{failed}</p>
	{:else}
		<Placeholder heights={placeholder} {radius} {gap} {label} />
	{/if}
</div>

<style>
	/* Lays its children out as if it weren't there (a stack's gap still applies). */
	.reveal {
		display: contents;
	}

	.failed {
		color: var(--colour-text-muted);
	}
</style>
