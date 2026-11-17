<script lang="ts">
	import { page } from '$app/state';

	interface Item {
		href: string;
		label: string;
	}

	interface Props {
		items: Item[];
		label: string;
	}

	let { items, label }: Props = $props();

	/** Longest matching href wins, so /lists/tasks beats /lists. */
	const activeIndex = $derived.by(() => {
		const path = page.url.pathname;
		let best = -1;
		items.forEach((item, index) => {
			const matches = path === item.href || path.startsWith(`${item.href}/`);
			if (matches && (best < 0 || item.href.length > items[best].href.length)) best = index;
		});
		return best;
	});

	type NavbarElement = HTMLElement & { setCurrent?: (index: number) => void };
	let navbar = $state<NavbarElement>();

	$effect(() => {
		if (activeIndex >= 0) navbar?.setCurrent?.(activeIndex);
	});
</script>

<!-- A small liquidglass.dev navbar: the glass pill springs between sections. -->
<lg-navbar bind:this={navbar} class="segmented-nav" aria-label={label} radius="capsule">
	{#each items as item, index (item.href)}
		<a href={item.href} aria-current={index === activeIndex ? 'page' : undefined}>{item.label}</a>
	{/each}
</lg-navbar>

<style>
	:global(lg-navbar.segmented-nav) {
		display: inline-grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(0, 1fr);
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
		border-radius: var(--radius-pill);
		color: var(--colour-text-muted);
	}

	:global(lg-navbar.segmented-nav .lg-nav__copy) {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(0, 1fr);
	}

	:global(lg-navbar.segmented-nav > a),
	:global(lg-navbar.segmented-nav .lg-nav__copy > span) {
		justify-content: center;
		height: 36px;
		padding: 0 20px;
		font-size: var(--text-small);
	}

	:global(lg-navbar.segmented-nav:not(:defined) > a[aria-current='page']) {
		color: var(--colour-accent);
	}
</style>
