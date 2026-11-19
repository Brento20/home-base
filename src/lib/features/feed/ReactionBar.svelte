<script lang="ts">
	/**
	 * The reactions under a post. Tapping one gives it; tapping yours again takes it back; one each.
	 * The change shows straight away and the server confirms it, so it feels instant on a slow line.
	 */
	import { enhance } from '$app/forms';
	import type { FeedPost, FeedReaction, Profile } from '#lib/types.js';
	import { summariseReactions } from './reactions.js';

	interface Props {
		post: FeedPost;
		people: Profile[];
		me: string;
	}

	let { post, people, me }: Props = $props();

	// What you just tapped, shown until the server's answer arrives (null = took it back).
	let pending = $state<{ reaction: FeedReaction | null } | null>(null);

	const shown = $derived.by(() => {
		if (!pending) return post;
		const others = post.reactions.filter((entry) => entry.profileId !== me);
		const reaction = pending.reaction;
		return {
			...post,
			reactions: reaction ? [...others, { profileId: me, reaction }] : others
		};
	});
	const reactions = $derived(summariseReactions(shown, people, me));
</script>

<form
	class="reactions"
	method="POST"
	action="/feed/{post.id}?/react"
	use:enhance={({ submitter }) => {
		const tapped = (submitter as HTMLButtonElement | null)?.value as FeedReaction | undefined;
		if (tapped) {
			const current = reactions.find((reaction) => reaction.mine)?.key ?? null;
			pending = { reaction: current === tapped ? null : tapped };
		}
		return async ({ update }) => {
			// Stay on this page: the action lives on the post's page, and SvelteKit would go there.
			await update({ reset: false, navigate: false });
			pending = null;
		};
	}}
>
	{#each reactions as reaction (reaction.key)}
		<button
			class="reaction"
			class:mine={reaction.mine}
			class:given={reaction.count > 0}
			name="reaction"
			value={reaction.key}
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
		border: 1px solid var(--colour-hairline);
		border-radius: var(--radius-pill);
		background: rgb(255 255 255 / 0.03);
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
