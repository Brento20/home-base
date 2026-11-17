<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Not found' : 'Something went wrong'} · home base</title>
</svelte:head>

<main class="error">
	<p class="status">{page.status}</p>
	<h1>{page.status === 404 ? 'That isn’t here' : 'Something went wrong'}</h1>
	{#if page.error?.message && page.status !== 404}<p class="message">{page.error.message}</p>{/if}
	{#if page.status === 404 && page.error?.message && page.error.message !== 'Not Found'}
		<p class="message">{page.error.message}</p>
	{/if}
	<a class="button-primary" href="/">Back to Today</a>
</main>

<style>
	.error {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: var(--space-m);
		max-width: 420px;
		min-height: 100dvh;
		margin: 0 auto;
		padding: var(--space-xl) var(--page-gutter);
	}

	.status {
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-accent);
	}

	h1 {
		font-size: var(--text-page-title);
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
	}

	.message {
		color: var(--colour-text-muted);
	}
</style>
