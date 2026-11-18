<script lang="ts">
	/**
	 * A post in the home feed: who wrote it and when, the message and photo, any plan made from it,
	 * reactions, and the conversation so far. On Today the whole card opens the post; on the post's
	 * own page (`full`) it shows everything and the replies follow underneath.
	 */
	import { describePlanWhen } from '#lib/features/plans/describe.js';
	import LinkedText from '#lib/features/plans/LinkedText.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { formatPostTime } from '#lib/time.js';
	import type { FeedPost, Profile } from '#lib/types.js';
	import PostMenu from './PostMenu.svelte';
	import ReactionBar from './ReactionBar.svelte';

	interface Props {
		post: FeedPost;
		people: Profile[];
		me: string;
		full?: boolean;
	}

	let { post, people, me, full = false }: Props = $props();

	const someone: Pick<Profile, 'displayName' | 'initials' | 'accentColour' | 'avatarUrl'> = {
		displayName: 'Someone',
		initials: '?',
		accentColour: 'var(--chart-other)',
		avatarUrl: null
	};
	const personFor = (id: string | null) => people.find((person) => person.id === id) ?? someone;
	const nameFor = (id: string | null) => (id === me ? 'You' : personFor(id).displayName);

	const author = $derived(personFor(post.authorId));
	const latestReply = $derived(post.replies.at(-1));
	const replyCount = $derived(post.replies.length);
</script>

<article class="post" class:full aria-labelledby="post-{post.id}-by">
	<GlassSurface radius={26} />
	<div class="body">
		<header class="byline">
			<Avatar person={author} size={34} />
			<p class="who">
				<span id="post-{post.id}-by" class="name">{nameFor(post.authorId)}</span>
				<time class="when" datetime={post.createdAt}
					>{formatPostTime(new Date(post.createdAt))}</time
				>
			</p>
			<PostMenu postId={post.id} mine={post.authorId === me} afterDelete={full ? '/' : undefined} />
		</header>

		{#if post.body}
			<p class="message" class:clamped={!full}><LinkedText text={post.body} /></p>
		{/if}

		{#if post.photoUrl}
			<img
				class="photo"
				class:cropped={!full}
				src={post.photoUrl}
				alt={post.body ? '' : `Photo from ${nameFor(post.authorId)}`}
				loading="lazy"
				decoding="async"
			/>
		{/if}

		{#each post.plans as plan (plan.id)}
			<a class="plan" href="/plans/{plan.id}">
				<Icon name="plans" size={18} />
				<span class="plan-text">
					<span class="plan-title">{plan.title}</span>
					<span class="plan-when"
						>{describePlanWhen({ ...plan, endsAt: null, notes: '', location: '' })}</span
					>
				</span>
				<Icon name="chevron" size={16} />
			</a>
		{/each}

		<div class="actions">
			<ReactionBar {post} {people} {me} />
			{#if !full && !latestReply}
				<span class="reply-hint" aria-hidden="true"><Icon name="reply" size={16} /> Reply</span>
			{/if}
		</div>

		{#if !full}
			{#if latestReply}
				<p class="latest">
					<span class="reply-count">{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
					<span class="reply-preview"
						><span class="reply-name">{nameFor(latestReply.authorId)}:</span>
						{latestReply.body}</span
					>
				</p>
			{/if}
			<!-- Covers the card so a tap anywhere opens the post; reactions, the menu and plans sit above it. -->
			<a class="open" href="/feed/{post.id}" aria-label="Open {nameFor(post.authorId)}’s post"></a>
		{/if}
	</div>
</article>

<style>
	.post {
		position: relative;
		border-radius: 26px;
	}

	.body {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px 18px 14px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
		transition: background-color var(--duration-quick) var(--ease-out);
	}

	.post:not(.full) .body:has(.open:global([data-pressed])) {
		background-color: rgb(255 255 255 / 0.03);
	}

	.byline {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.who {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
		line-height: 1.25;
	}

	.name {
		font-weight: var(--weight-medium);
	}

	.when {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.message {
		font-size: var(--text-body);
		line-height: 1.45;
		overflow-wrap: anywhere;
		white-space: pre-line;
	}

	.full .message {
		font-size: 1.1875rem;
	}

	.clamped {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 6;
		line-clamp: 6;
		overflow: hidden;
	}

	.message :global(a) {
		position: relative;
		z-index: 2;
		color: var(--colour-accent);
	}

	.photo {
		display: block;
		width: 100%;
		border-radius: 18px;
		background: rgb(255 255 255 / 0.04);
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
	}

	.cropped {
		aspect-ratio: 4 / 3;
		object-fit: cover;
	}

	.plan {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 52px;
		padding: 8px 12px;
		border-radius: 16px;
		background: var(--colour-accent-soft);
		box-shadow: inset 0 0 0 1px var(--colour-accent-edge);
		color: inherit;
		text-decoration: none;
	}

	.plan > :global(svg:first-child) {
		color: var(--colour-accent);
	}

	.plan > :global(svg:last-child) {
		color: var(--colour-text-faint);
	}

	.plan-text {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
		line-height: 1.3;
	}

	.plan-title {
		font-weight: var(--weight-medium);
		overflow-wrap: anywhere;
	}

	.plan-when {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	/* The reactions and menu stay tappable above the covering link. */
	.actions :global(.reactions),
	.byline :global(.post-menu) {
		position: relative;
		z-index: 2;
	}

	/* A hint, not a control: tapping anywhere outside the reactions opens the post to reply. */
	.reply-hint {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: 6px;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.latest {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding-top: 10px;
		border-top: 1px solid var(--colour-hairline);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
		min-width: 0;
	}

	.reply-count {
		flex: none;
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		color: var(--colour-text);
	}

	.reply-preview {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.reply-name {
		color: var(--colour-text);
	}

	.open {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: inherit;
	}

	.open:focus-visible {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}
</style>
