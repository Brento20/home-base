<script lang="ts">
	/** The round accent button for add actions: a link when given href, otherwise a submit button. */
	import Icon, { type IconName } from './Icon.svelte';

	interface Props {
		icon: IconName;
		label: string;
		/** Renders a link when set, otherwise a submit button. */
		href?: string;
	}

	let { icon, label, href }: Props = $props();
</script>

{#if href}
	<a class="round-button" {href} aria-label={label}><Icon name={icon} size={20} /></a>
{:else}
	<button class="round-button" aria-label={label}><Icon name={icon} size={20} /></button>
{/if}

<style>
	.round-button {
		display: grid;
		place-items: center;
		flex: none;
		width: var(--tap-target);
		height: var(--tap-target);
		border: 0;
		border-radius: 50%;
		background: var(--colour-accent);
		color: var(--colour-on-accent);
		transition: transform var(--duration-release) var(--spring-bouncy);
	}

	/* A round drop of liquid: flattens when pressed and bounces back. */
	.round-button:active {
		transform: scale(1.1, 0.86);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}
</style>
