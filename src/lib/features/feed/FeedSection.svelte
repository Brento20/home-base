<script lang="ts">
	/**
	 * The home feed on Today: the newest posts, then older ones as you scroll down. How many are
	 * shown lives in the URL (?feed=15), so the server loads them all and the 20-second refresh
	 * keeps every visible post's reactions and replies up to date.
	 */
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { FeedPost, Profile } from '#lib/types.js';
	import PostCard from './PostCard.svelte';

	interface Props {
		posts: FeedPost[];
		hasMore: boolean;
		people: Profile[];
		me: string;
		/** How many more each step loads. */
		pageSize: number;
	}

	let { posts, hasMore, people, me, pageSize }: Props = $props();

	let end = $state<HTMLElement>();
	let loading = $state(false);

	async function loadOlder() {
		if (loading || !hasMore) return;
		loading = true;
		const url = new URL(page.url.href);
		url.searchParams.set('feed', String(posts.length + pageSize));
		try {
			await goto(url, { replace: true, reset: false });
		} finally {
			loading = false;
		}
	}

	// Load the next few when the end of the feed comes near the screen.
	$effect(() => {
		if (!end || !hasMore || !('IntersectionObserver' in window)) return;
		const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && loadOlder(), {
			rootMargin: '400px 0px'
		});
		observer.observe(end);
		return () => observer.disconnect();
	});
</script>

<section class="feed" aria-labelledby="feed-heading">
	<div class="heading-row">
		<h2 id="feed-heading" class="section-label">Home feed</h2>
		<a class="see-all" href="/feed/new">Post update</a>
	</div>

	{#if posts.length === 0}
		<p class="empty">
			Nothing here yet. <a href="/feed/new">Share an update</a> and it’ll show here for everyone at home.
		</p>
	{:else}
		<ol class="posts">
			{#each posts as post (post.id)}
				<li><PostCard {post} {people} {me} /></li>
			{/each}
		</ol>

		<div class="end" bind:this={end}>
			{#if hasMore}
				<button type="button" class="button-quiet" onclick={loadOlder} disabled={loading}>
					{loading ? 'Loading older posts…' : 'Show older posts'}
				</button>
			{:else if posts.length > 3}
				<p class="all-caught-up">That’s everything.</p>
			{/if}
		</div>
	{/if}
</section>

<style>
	.heading-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.section-label {
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
	}

	.see-all {
		padding: 10px 0;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
		text-decoration: none;
	}

	.posts {
		display: flex;
		flex-direction: column;
		gap: 14px;
		margin: 6px 0 0;
		padding: 0;
		list-style: none;
	}

	.end {
		display: flex;
		justify-content: center;
		min-height: var(--tap-target);
		margin-top: var(--space-s);
	}

	.all-caught-up {
		align-self: center;
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.empty {
		padding: var(--space-s) 0;
		color: var(--colour-text-faint);
	}

	.empty a {
		color: var(--colour-text-muted);
	}
</style>
