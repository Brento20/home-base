<script lang="ts">
	/** A small switch between sections (Lists | Tasks): a glass pill springs between them. */
	import { page } from '$app/state';
	import PillNav from './PillNav.svelte';

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
	function indexFor(path: string) {
		let best = -1;
		items.forEach((item, index) => {
			const matches = path === item.href || path.startsWith(`${item.href}/`);
			if (matches && (best < 0 || item.href.length > items[best].href.length)) best = index;
		});
		return best;
	}

	const current = $derived(indexFor(page.url.pathname));
</script>

<PillNav {items} {indexFor} {current} {label} variant="segmented">
	{#snippet item(entry)}{entry.label}{/snippet}
</PillNav>
