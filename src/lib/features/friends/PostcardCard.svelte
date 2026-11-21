<script lang="ts">
	/**
	 * A postcard from a friend of someone here, in the home feed: who sent it, from which home,
	 * when, the photo and the message. Set apart from the home's own posts by a dashed edge, like the back
	 * of a postcard. It opens its own page, where anyone here can take it down or block the sender.
	 */
	import LinkedText from '#lib/features/plans/LinkedText.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
	import { formatPostTime } from '#lib/time.js';
	import type { FeedPost, PostcardFrom } from '#lib/types.js';

	interface Props {
		post: FeedPost & { postcard: PostcardFrom };
		/** On its own page: the whole message, and no link. */
		full?: boolean;
	}

	let { post, full = false }: Props = $props();
	const from = $derived(post.postcard);
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
				>Postcard from {from.name}{#if from.home}<span class="home">{` · ${from.home}`}</span
					>{/if}</span
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
	{#if !full}
		<a class="open" href="/postcards/{post.id}" aria-label="Open the postcard from {from.name}"></a>
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
