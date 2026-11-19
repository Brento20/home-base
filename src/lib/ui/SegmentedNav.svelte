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

	/**
	 * Longest matching href wins, so /lists/tasks beats /lists. An href with a query
	 * (?mode=compare) matches only when the URL has those values too.
	 */
	function indexFor(url: {
		pathname: string;
		href: string;
		searchParams: { get(name: string): string | null };
	}) {
		let best = -1;
		let bestLength = -1;
		items.forEach((item, index) => {
			const target = new URL(item.href, url.href);
			const path = url.pathname;
			const onPath = path === target.pathname || path.startsWith(`${target.pathname}/`);
			const query = [...target.searchParams].every(
				([key, value]) => url.searchParams.get(key) === value
			);
			if (onPath && query && item.href.length > bestLength) {
				best = index;
				bestLength = item.href.length;
			}
		});
		return best;
	}

	const current = $derived(indexFor(page.url));
</script>

<PillNav {items} {indexFor} {current} {label} variant="segmented">
	{#snippet item(entry)}{entry.label}{/snippet}
</PillNav>
