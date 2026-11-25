<script lang="ts">
	import type { Snippet } from 'svelte';
	import GlassSurface from './GlassSurface.svelte';

	interface Props {
		children: Snippet;
		glow?: boolean;
		padding?: string;
	}

	let { children, glow = false, padding = 'var(--space-l)' }: Props = $props();
</script>

<!-- A static glass card. Put a <form> inside it rather than making it the form. -->
<div class="glass-card" class:glow>
	<GlassSurface radius={28} {glow} />
	<div class="content" style:padding>
		{@render children()}
	</div>
</div>

<style>
	.glass-card {
		position: relative;
		border-radius: var(--radius-card);
	}

	.content {
		position: relative;
		z-index: 1;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 var(--hairline) var(--colour-separator-strong),
			var(--glass-highlight);
	}

	.glow .content {
		box-shadow:
			inset 0 0 0 var(--hairline) var(--colour-accent-separator),
			var(--glass-highlight);
	}
</style>
