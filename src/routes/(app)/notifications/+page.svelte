<script lang="ts">
	/**
	 * Every notification from the last two months, newest first, split into new and earlier. The
	 * newest few also show at the top of Home. Phone notifications are set in Preferences.
	 */
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import NotificationList from '#lib/features/notifications/NotificationList.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const fresh = $derived(data.notifications.filter((item) => !item.read));
	const earlier = $derived(data.notifications.filter((item) => item.read));

	onMount(() => {
		if (!data.unread) return;
		const timer = setTimeout(async () => {
			const response = await fetch('/notifications/seen', { method: 'POST' }).catch(() => null);
			if (response?.ok) await invalidate('app:unread');
		}, 1500);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>Notifications · home base</title>
</svelte:head>

<PageHeader title="Notifications">
	{#snippet lead()}
		<a class="button-quiet" href="/home"><Icon name="back" size={18} /> Home</a>
	{/snippet}
</PageHeader>

{#if data.notifications.length === 0}
	<p class="empty">
		All quiet. Friend requests, postcards, replies, reacts and invites will show up here.
	</p>
{:else}
	{#if fresh.length}
		<section aria-labelledby="fresh-heading">
			<h2 id="fresh-heading" class="section-label caption-label">New</h2>
			<NotificationList items={fresh} />
		</section>
	{/if}
	{#if earlier.length}
		<section aria-labelledby="earlier-heading">
			<h2 id="earlier-heading" class="section-label caption-label">Earlier</h2>
			<NotificationList items={earlier} />
		</section>
	{/if}
{/if}

<a class="settings-link" href="/profile/preferences#notifications">
	Notifications on this phone <Icon name="chevron" size={16} trim />
</a>

<style>
	section + section {
		margin-top: var(--space-l);
	}

	.empty {
		color: var(--colour-text-muted);
	}

	.settings-link {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		margin-top: var(--space-l);
		font-size: var(--text-small);
		color: var(--colour-accent);
		text-decoration: none;
	}
</style>
