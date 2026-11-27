<script lang="ts">
	/**
	 * The reactions under a post. Tapping one gives it; tapping yours again takes it back; one each.
	 * The change shows straight away and stays: nothing reloads for a reaction (the save only
	 * sends it), so the screen can't flick back. The next refresh brings everyone else's.
	 *
	 * Each button posts the reaction it would leave you with ('none' to take yours back), so two
	 * quick taps mean exactly what they look like, and taps are sent one at a time, in order.
	 */
	import { enhance } from '$app/forms';
	import { save } from '#lib/ui/save.svelte.js';
	import type { FeedPost, FeedReaction, Profile } from '#lib/types.js';
	import { isReaction, summariseReactions } from './reactions.js';

	interface Props {
		post: FeedPost;
		people: Profile[];
		me: string;
		/** Where the tap goes: the post's page by default; a postcard's page for postcards. */
		action?: string;
	}

	let { post, people, me, action = `/feed/${post.id}?/react` }: Props = $props();

	const asReaction = (value: FormDataEntryValue | null): FeedReaction | null =>
		typeof value === 'string' && isReaction(value) ? value : null;

	// Your reaction as the server has it, kept until fresh data for this post arrives. Tied to
	// the post's reactions list rather than the post: a card may pass a fresh copy of the post
	// on every render, but the list only changes when new data does.
	let saved = $state<{ for: FeedPost['reactions']; reaction: FeedReaction | null } | null>(null);

	const reacting = save<FeedReaction | null>({
		serial: true,
		refresh: 'none',
		// Stay on this screen: the action lives on the post's page.
		navigate: false,
		optimistic: ({ formData }) => asReaction(formData.get('reaction')),
		after: (result, { value }) => {
			if (result.type === 'success' && value !== undefined)
				saved = { for: post.reactions, reaction: value };
		}
	});

	const mine = $derived(
		reacting.pending !== undefined
			? { reaction: reacting.pending }
			: saved?.for === post.reactions
				? { reaction: saved.reaction }
				: null
	);
	const shown = $derived.by(() => {
		if (!mine) return post;
		const others = post.reactions.filter((entry) => entry.profileId !== me);
		return {
			...post,
			reactions: mine.reaction ? [...others, { profileId: me, reaction: mine.reaction }] : others
		};
	});
	const reactions = $derived(summariseReactions(shown, people, me));
</script>

<form class="reactions" method="POST" {action} use:enhance={reacting.enhance}>
	{#each reactions as reaction (reaction.key)}
		<button
			class="reaction"
			data-haptic
			class:mine={reaction.mine}
			class:given={reaction.count > 0}
			name="reaction"
			value={reaction.mine ? 'none' : reaction.key}
			aria-pressed={reaction.mine}
			aria-label={reaction.count > 0 ? `${reaction.label}: ${reaction.who}` : reaction.label}
		>
			<span class="emoji" aria-hidden="true">{reaction.emoji}</span>
			{#if reaction.count > 0}<span class="count" aria-hidden="true">{reaction.count}</span>{/if}
		</button>
	{/each}
</form>

<style>
	.reactions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
	}

	/* Slim pills, with a 44px-tall tap area. */
	.reaction::after {
		content: '';
		position: absolute;
		inset: -5px 0;
	}

	.reaction {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		min-width: 44px;
		height: 34px;
		padding: 0 11px;
		border: var(--hairline) solid var(--colour-separator);
		border-radius: var(--radius-pill);
		background: var(--colour-press);
		color: var(--colour-text-muted);
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		transition:
			background-color var(--duration-quick) var(--ease-out),
			border-color var(--duration-quick) var(--ease-out),
			transform var(--duration-release) var(--spring-gentle);
	}

	/* Untouched reactions sit back so the ones people gave stand out. */
	.reaction:not(.given) .emoji {
		opacity: 0.55;
		filter: grayscale(0.6);
	}

	.reaction:global([data-pressed]) {
		transform: scale(0.9);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}

	.mine {
		border-color: var(--colour-accent-edge);
		background: var(--colour-accent-soft);
		color: var(--colour-text);
	}

	.emoji {
		font-size: 1rem;
		line-height: 1;
		transition:
			opacity var(--duration-quick) var(--ease-out),
			filter var(--duration-quick) var(--ease-out);
	}

	.count {
		font-variant-numeric: tabular-nums;
	}
</style>
