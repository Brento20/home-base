<script lang="ts">
	import '@fontsource-variable/geist';
	import '#lib/styles/tokens.css';
	import '#lib/styles/base.css';
	import '#lib/styles/forms.css';
	import { onMount } from 'svelte';
	import { markHydrated } from '#lib/copy/pick.js';
	import { applyDaypart } from '#lib/ui/daypart.js';
	import AppStatus from '#lib/ui/AppStatus.svelte';
	import { loadGlass } from '#lib/ui/glass.js';
	import { usePageTransitions } from '#lib/ui/page-transitions.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	usePageTransitions();

	onMount(() => {
		// From here on, each screen opened gets a fresh heading (src/lib/copy/pick.ts).
		markHydrated();
		loadGlass();
		applyDaypart();
		const timer = setInterval(applyDaypart, 5 * 60 * 1000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>home base</title>
</svelte:head>

<!-- The tab bar's glass refracts an aligned copy of .app-backdrop; cards blur it. -->
<div class="app" data-lg-backdrop=".app-backdrop">
	<div class="app-backdrop" aria-hidden="true"></div>
	{@render children()}
</div>

<AppStatus />

<style>
	.app {
		position: relative;
		min-height: 100dvh;
		isolation: isolate;
	}

	.app-backdrop {
		position: fixed;
		inset: 0;
		z-index: -1;
		background-color: var(--colour-ground);
		background-image: var(--grain), var(--mesh-one), var(--mesh-two), var(--mesh-three);
		background-size:
			var(--grain-size) var(--grain-size),
			100% 100%,
			100% 100%,
			100% 100%;
		background-repeat: repeat, no-repeat, no-repeat, no-repeat;
		transition: background-color var(--duration-settle) var(--ease-out);
	}
</style>
