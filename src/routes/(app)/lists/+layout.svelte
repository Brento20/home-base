<script lang="ts">
	/**
	 * Lists and Tasks share a heading and the Lists | Tasks switch, kept here so they stay put
	 * (and the pill slides) while only what's below them changes, as Plans' List | Calendar
	 * does. Deeper pages (a list, a task, the past pages) have their own headers instead.
	 */
	import { page } from '$app/state';
	import ListsNav from '#lib/features/lists/ListsNav.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import RoundButton from '#lib/ui/RoundButton.svelte';

	let { children } = $props();

	const VIEWS = ['/(app)/lists', '/(app)/lists/tasks'];
	const isView = $derived(VIEWS.includes(page.route.id ?? ''));
</script>

{#if isView}
	<PageHeader title="Lists">
		{#snippet action()}
			<!-- On Tasks, the + opens the full new task form, as Plans' + opens a new plan. -->
			{#if page.route.id === '/(app)/lists/tasks'}
				<RoundButton icon="plus" label="New task" href="/lists/tasks/new" />
			{/if}
		{/snippet}
	</PageHeader>
	<ListsNav />
	<div data-view-content>
		{@render children()}
	</div>
{:else}
	{@render children()}
{/if}
