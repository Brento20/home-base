<script lang="ts">
	import { arrive, glide, leave } from '#lib/ui/motion.js';
	/**
	 * The home feed on Today. The page brings only the newest few posts (and the 20-second refresh
	 * keeps just those fresh); scrolling near the end fetches older ones from /feed/older, a few at
	 * a time, and adds them below. Older posts already shown are fetched again in one go whenever
	 * the page's data changes (a reaction, a reply, the refresh), so they never go stale.
	 * Postcards from friends come mixed in by time (listFeed) and show as PostcardCard.
	 */
	import { untrack } from 'svelte';
	import { pick } from '#lib/copy/pick.js';
	import { EMPTY } from '#lib/copy/voice.js';
	import type { FeedPost, Profile } from '#lib/types.js';
	import PostcardCard from '#lib/features/friends/PostcardCard.svelte';
	import PostCard from './PostCard.svelte';

	interface Props {
		/** Null while the feed is still on its way (Today streams it in after the rest). */
		posts: FeedPost[] | null;
		/** The feed couldn't be fetched (and there's nothing older to show). */
		unavailable?: boolean;
		hasMore: boolean;
		people: Profile[];
		me: string;
		/** How many more each step loads. */
		pageSize: number;
	}

	let { posts: arriving, unavailable = false, hasMore, people, me, pageSize }: Props = $props();
	const posts = $derived(arriving ?? []);

	// Said a little differently each visit (src/lib/copy/voice.ts).
	const emptyLine = pick(EMPTY.feed);

	let end = $state<HTMLElement>();
	let older = $state<FeedPost[]>([]);
	let olderHasMore = $state<boolean | null>(null);
	let loading = $state(false);
	let failed = $state(false);

	// The page's posts first; older ones after, without repeats if a new post pushed one down.
	const shown = $derived([
		...posts,
		...older.filter((post) => !posts.some((entry) => entry.id === post.id))
	]);
	const moreToLoad = $derived(olderHasMore ?? hasMore);

	async function fetchOlder(before: string, limit: number) {
		const response = await fetch(
			`/feed/older?before=${encodeURIComponent(before)}&limit=${limit}`,
			{ headers: { accept: 'application/json' } }
		);
		if (!response.ok) throw new Error(String(response.status));
		return (await response.json()) as { posts: FeedPost[]; hasMore: boolean };
	}

	async function loadOlder() {
		const last = shown.at(-1);
		if (loading || !moreToLoad || !last) return;
		loading = true;
		failed = false;
		try {
			const page = await fetchOlder(last.createdAt, pageSize);
			older = [...older, ...page.posts];
			olderHasMore = page.hasMore;
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	}

	// When the page's data changes, refresh the older posts already showing, in one request.
	$effect(() => {
		const newest = posts.at(-1)?.createdAt;
		// Only the page's posts should trigger this, not the older ones it's about to replace.
		const count = untrack(() => older.length);
		if (!newest || count === 0) return;
		let stale = false;
		fetchOlder(newest, count)
			.then((page) => {
				if (stale) return;
				older = page.posts;
				olderHasMore = page.hasMore;
			})
			.catch(() => {});
		return () => (stale = true);
	});

	// Load the next few when the end of the feed comes near the screen.
	$effect(() => {
		if (!end || !moreToLoad || !('IntersectionObserver' in window)) return;
		const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && loadOlder(), {
			rootMargin: '400px 0px'
		});
		observer.observe(end);
		return () => observer.disconnect();
	});
</script>

<section class="feed" aria-labelledby="feed-heading">
	<div class="section-heading-row">
		<h2 id="feed-heading" class="section-heading">Home feed</h2>
		<a class="see-all section-heading-link" href="/feed/new">Post update</a>
	</div>

	{#if arriving === null && unavailable}
		<p class="empty">Couldn’t load the feed. Pull down to try again.</p>
	{:else if arriving === null}
		<div class="arriving" aria-busy="true" aria-label="Loading the feed"></div>
	{:else if posts.length === 0}
		<p class="empty">{emptyLine} <a href="/feed/new">Post an update</a></p>
	{:else}
		<ol class="posts">
			{#each shown as post (post.id)}
				<li in:arrive={{ y: -12 }} out:leave animate:glide>
					{#if post.postcard}
						<PostcardCard post={{ ...post, postcard: post.postcard }} {people} {me} />
					{:else}
						<PostCard {post} {people} {me} />
					{/if}
				</li>
			{/each}
		</ol>

		<div class="end" bind:this={end}>
			{#if moreToLoad}
				<button type="button" class="button-quiet" onclick={loadOlder} disabled={loading}>
					{loading
						? 'Loading older posts…'
						: failed
							? 'Couldn’t load. Try again'
							: 'Show older posts'}
				</button>
			{:else if shown.length > 3}
				<p class="all-caught-up">That’s everything.</p>
			{/if}
		</div>
	{/if}
</section>

<style>
	/* Holds roughly a post's height while the feed arrives, so nothing below jumps. */
	.arriving {
		min-height: 180px;
		margin-top: var(--space-m);
		border-radius: 24px;
		background: var(--colour-fill);
		opacity: 0.5;
	}

	.see-all {
		padding: 10px 0;
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
