<script lang="ts">
	/**
	 * Preferences: how home base looks and behaves for you, and only you (your housemates keep
	 * their own). Notifications on this phone, appearance (light or dark, the background through
	 * the day), then calmer screens and Today (display preferences). Everything saves as you tap.
	 */
	import AppearanceSettings from '#lib/features/account/AppearanceSettings.svelte';
	import DisplaySettings from '#lib/features/account/DisplaySettings.svelte';
	import NotificationSettings from '#lib/features/notifications/NotificationSettings.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Preferences · home base</title>
</svelte:head>

<PageHeader title="Preferences">
	{#snippet lead()}
		<a class="button-quiet" href="/profile"><Icon name="back" size={18} /> You &amp; friends</a>
	{/snippet}
</PageHeader>

<p class="explain">Just for you: your housemates keep their own. Changes save as you tap.</p>

<NotificationSettings pushKey={data.pushKey} sampleMode={data.sampleMode} />

<AppearanceSettings />

<DisplaySettings saved={data.display} />

<style>
	.explain {
		margin: 0 0 var(--space-l);
		color: var(--colour-text-muted);
	}
</style>
