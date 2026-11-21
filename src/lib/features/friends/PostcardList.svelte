<script lang="ts">
	/**
	 * Postcards as a compact list: a thumbnail of the photo (or a stamp with the sender's initial),
	 * who it was from or to, the start of the message, when, and how many reactions and replies.
	 * Each opens the postcard. Used on your profile and on a friend's page.
	 */
	import Icon from '#lib/ui/Icon.svelte';
	import { formatPostTime } from '#lib/time.js';
	import type { FeedPost } from '#lib/types.js';

	interface Props {
		postcards: FeedPost[];
		me: string;
		/** A friend's name by id, for postcards you sent ("To Sam"). */
		nameOf: (id: string | null) => string | null;
	}

	let { postcards, me, nameOf }: Props = $props();

	const heading = (card: FeedPost) => {
		const from = card.postcard!;
		if (from.profileId !== me) return `From ${from.name}`;
		const to = nameOf(from.toProfileId);
		return to ? `To ${to}` : 'You sent';
	};
</script>

<ul class="grouped postcard-list">
	{#each postcards as card (card.id)}
		{@const from = card.postcard!}
		<li>
			<a class="grouped-row" href="/postcards/{card.id}">
				{#if card.photoUrl}
					<img class="thumb" src={card.photoUrl} alt="" loading="lazy" decoding="async" />
				{:else}
					<span class="thumb stamp" style:--stamp={from.colour} aria-hidden="true"
						>{from.initials}</span
					>
				{/if}
				<span class="grouped-label">
					<span class="top">
						<span class="who">{heading(card)}</span>
						<time datetime={card.createdAt}>{formatPostTime(new Date(card.createdAt))}</time>
					</span>
					<span class="grouped-sub snippet">{card.body || 'A photo'}</span>
					{#if card.reactions.length || card.replies.length}
						<span class="grouped-sub counts">
							{#if card.reactions.length}❤︎ {card.reactions.length}{/if}
							{#if card.replies.length}
								<span class="replies"><Icon name="reply" size={12} /> {card.replies.length}</span>
							{/if}
						</span>
					{/if}
				</span>
				<span class="grouped-chevron"><Icon name="chevron" size={16} /></span>
			</a>
		</li>
	{/each}
</ul>

<style>
	.postcard-list {
		--grouped-inset: 82px;
	}

	.thumb {
		width: 54px;
		height: 54px;
		flex: none;
		border-radius: 10px;
		object-fit: cover;
		background: #f6f1ea;
		padding: 3px;
	}

	/* No photo: a stamp in the sender's colour. */
	.stamp {
		display: grid;
		place-items: center;
		padding: 0;
		background: color-mix(in oklab, var(--stamp) 30%, var(--colour-fill));
		outline: 1.5px dashed color-mix(in oklab, var(--stamp) 70%, transparent);
		outline-offset: -5px;
		font-weight: var(--weight-strong);
		color: var(--colour-text);
	}

	.top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.who {
		font-weight: var(--weight-medium);
	}

	time {
		flex: none;
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.snippet {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.counts {
		display: flex;
		gap: 10px;
	}

	.replies {
		display: inline-flex;
		align-items: center;
		gap: 3px;
	}

	.grouped-row {
		padding-top: 10px;
		padding-bottom: 10px;
	}
</style>
