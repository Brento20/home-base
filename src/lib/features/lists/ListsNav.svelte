<script lang="ts">
	/** The Lists | Tasks switch at the top of both pages. */
	import SegmentedNav from '#lib/ui/SegmentedNav.svelte';
</script>

<div class="lists-nav">
	<SegmentedNav
		label="Lists"
		items={[
			{ href: '/lists', label: 'Lists' },
			{ href: '/lists/tasks', label: 'Tasks' }
		]}
	/>
</div>

<style>
	.lists-nav {
		margin-bottom: var(--space-l);
	}
</style>
