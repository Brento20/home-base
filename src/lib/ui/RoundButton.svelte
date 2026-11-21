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
	<a class="round-accent" {href} aria-label={label}><Icon name={icon} size={20} /></a>
{:else}
	<button class="round-accent" aria-label={label}><Icon name={icon} size={20} /></button>
{/if}

<!-- Styled by .round-accent in src/lib/styles/forms.css, shared with the add buttons in fields. -->
