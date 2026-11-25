<script lang="ts">
	/**
	 * A postcard: who sent it, from which home, when, the photo and the message, then reactions
	 * and the latest reply. Set apart from the home's own posts by a dashed edge, like the back of
	 * a postcard. It opens its own page (the replies, Send one back, taking it down). The person
	 * who sent it sees it the same way, as "Your postcard to …".
	 */
	import ReactionBar from '#lib/features/feed/ReactionBar.svelte';
	import LinkedText from '#lib/features/plans/LinkedText.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { formatPostTime } from '#lib/time.js';
	import type { FeedPost, PostcardFrom, Profile } from '#lib/types.js';

	interface Props {
		post: FeedPost & { postcard: PostcardFrom };
		/** People in your home, to name their reactions and replies. */
		people: Profile[];
		me: string;
		/** Who it went to, for postcards you sent ("Your postcard to Sam"). */
		toName?: string | null;
		/** On its own page: the whole message, no link, no reply preview. */
		full?: boolean;
	}

	let { post, people, me, toName = null, full = false }: Props = $props();
	const from = $derived(post.postcard);
	const mine = $derived(from.profileId === me);
	const latestReply = $derived(post.replies.at(-1));
	const replyCount = $derived(post.replies.length);
	const replyName = (reply: NonNullable<typeof latestReply>) =>
		reply.authorId === me
			? 'You'
			: (people.find((person) => person.id === reply.authorId)?.displayName ??
				reply.author?.name ??
				'Someone');
</script>

<article class="postcard" aria-labelledby="postcard-{post.id}-from">
	<header class="byline">
		<Avatar
			person={{
				displayName: from.name,
				initials: from.initials,
				accentColour: from.colour,
				avatarUrl: null
			}}
			size={38}
		/>
		<p class="who">
			<span id="postcard-{post.id}-from" class="name"
				>{#if mine}Your postcard{#if toName}<span class="home">{` to ${toName}`}</span
						>{/if}{:else}Postcard from {from.name}{#if from.home}<span class="home"
							>{` · ${from.home}`}</span
						>{/if}{/if}</span
			>
			<time class="when" datetime={post.createdAt}>{formatPostTime(new Date(post.createdAt))}</time>
		</p>
	</header>
	{#if post.photoUrl}
		<img
			class="photo"
			class:cropped={!full}
			src={post.photoUrl}
			alt={post.body ? '' : `Photo from ${from.name}`}
			loading="lazy"
			decoding="async"
		/>
	{/if}
	{#if post.body}
		<p class="message" class:clamped={!full}><LinkedText text={post.body} /></p>
	{/if}
	<div class="actions">
		<ReactionBar {post} {people} {me} action="/postcards/{post.id}?/react" />
		{#if !full && !latestReply}
			<span class="reply-hint" aria-hidden="true"><Icon name="reply" size={16} /> Reply</span>
		{/if}
	</div>
	{#if !full}
		{#if latestReply}
			<p class="latest">
				<span class="reply-count">{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
				<span class="reply-preview"
					><span class="reply-name">{replyName(latestReply)}:</span> {latestReply.body}</span
				>
			</p>
		{/if}
		<!-- Covers the card so a tap anywhere opens it; the reactions sit above it. -->
		<a class="open" href="/postcards/{post.id}" aria-label="Open the postcard"></a>
	{/if}
</article>

<style>
	.postcard {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px 18px;
		border-radius: 26px;
		background: var(--colour-fill);
		outline: 1.5px dashed var(--colour-hairline-strong);
		outline-offset: -7px;
		transition: background-color var(--duration-quick) var(--ease-out);
	}

	.postcard:has(.open:global([data-pressed])) {
		background-color: var(--colour-press);
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

	.home {
		font-weight: var(--weight-regular);
		color: var(--colour-text-muted);
	}

	.when {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	/* Like a print on the front of a postcard: a white border all round. */
	.photo {
		display: block;
		width: 100%;
		padding: 6px;
		border-radius: 16px;
		background: #f6f1ea;
		box-shadow: 0 6px 18px -10px var(--shadow-colour);
	}

	.cropped {
		aspect-ratio: 4 / 3;
		object-fit: cover;
	}

	.message {
		white-space: pre-line;
		overflow-wrap: anywhere;
	}

	.clamped {
		display: -webkit-box;
		-webkit-line-clamp: 6;
		line-clamp: 6;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.actions {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.reply-hint {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.latest {
		display: flex;
		align-items: baseline;
		gap: 8px;
		min-width: 0;
		padding-top: 10px;
		border-top: var(--hairline) solid var(--colour-separator);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
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

	/* The whole card opens the postcard; links in the message stay tappable above it. */
	.open {
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}

	.message :global(a) {
		position: relative;
		z-index: 1;
	}
</style>
