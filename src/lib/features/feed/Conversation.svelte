<script lang="ts">
	/**
	 * The replies under a post or a postcard, oldest first, with a box to add one. Your own replies
	 * can be deleted with two taps. The page provides the actions: ?/reply and ?/deleteReply.
	 * Postcard replies may come from someone in another home, so they carry the author's name.
	 */
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	import { enhance } from '$app/forms';
	import LinkedText from '#lib/features/plans/LinkedText.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
	import { formatPostTime } from '#lib/time.js';
	import type { FeedReply, Profile } from '#lib/types.js';

	interface Props {
		replies: FeedReply[];
		people: Profile[];
		me: string;
		replyMax: number;
		/** A problem with the last reply sent (from the page's form result). */
		problem?: string | null;
	}

	let { replies, people, me, replyMax, problem = null }: Props = $props();

	const someone: Pick<Profile, 'displayName' | 'initials' | 'accentColour' | 'avatarUrl'> = {
		displayName: 'Someone',
		initials: '?',
		accentColour: 'var(--chart-other)',
		avatarUrl: null
	};
	const personFor = (entry: FeedReply) =>
		people.find((person) => person.id === entry.authorId) ??
		(entry.author
			? {
					displayName: entry.author.name,
					initials: entry.author.initials,
					accentColour: entry.author.colour,
					avatarUrl: null
				}
			: someone);
	const nameFor = (entry: FeedReply) =>
		entry.authorId === me ? 'You' : personFor(entry).displayName;

	let reply = $state('');
	let sending = $state(false);
	let armedReply = $state<string | null>(null);
	let list = $state<HTMLElement>();
</script>

<section class="conversation" aria-labelledby="replies-heading">
	<h2 id="replies-heading" class="caption-label">
		{replies.length === 0
			? 'No replies yet'
			: `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
	</h2>

	{#if replies.length > 0}
		<ol class="replies" bind:this={list}>
			{#each replies as entry (entry.id)}
				<li class="reply">
					<Avatar person={personFor(entry)} size={30} />
					<div class="reply-body">
						<p class="reply-meta">
							<span class="reply-name">{nameFor(entry)}</span>
							<time datetime={entry.createdAt}>{formatPostTime(new Date(entry.createdAt))}</time>
						</p>
						<p class="reply-text"><LinkedText text={entry.body} /></p>
						{#if entry.authorId === me}
							<form method="POST" action="?/deleteReply" use:enhance>
								<input type="hidden" name="replyId" value={entry.id} />
								<button
									class="reply-delete"
									onclick={(event) => {
										if (armedReply === entry.id) return;
										event.preventDefault();
										armedReply = entry.id;
									}}
								>
									{armedReply === entry.id ? 'Tap again to delete' : 'Delete'}
								</button>
							</form>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	{/if}

	<form
		class="reply-form"
		method="POST"
		action="?/reply"
		use:enhance={({ cancel }) => {
			if (!reply.trim()) return cancel();
			sending = true;
			return async ({ result, update }) => {
				await update();
				sending = false;
				if (result.type === 'success') {
					reply = '';
					requestAnimationFrame(() =>
						list?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' })
					);
				}
			};
		}}
	>
		<label class="visually-hidden" for="reply">Reply</label>
		<textarea
			id="reply"
			class="field-input"
			name="body"
			rows="2"
			maxlength={replyMax}
			placeholder={PLACEHOLDERS.reply[0]}
			use:placeholderReel={PLACEHOLDERS.reply}
			bind:value={reply}
			aria-invalid={problem ? 'true' : undefined}></textarea>
		<button class="button-primary send" disabled={sending || !reply.trim()}>
			{sending ? 'Sending…' : 'Send'}
		</button>
		{#if problem}<span class="field-error">{problem}</span>{/if}
	</form>
</section>

<style>
	.conversation {
		margin-top: var(--space-l);
	}

	.replies {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin: var(--space-s) 0 0;
		padding: 0;
		list-style: none;
	}

	.reply {
		display: flex;
		gap: 12px;
		padding: 10px 0;
		border-bottom: 1px solid var(--colour-hairline);
	}

	.reply-body {
		flex: 1;
		min-width: 0;
	}

	.reply-meta {
		display: flex;
		align-items: baseline;
		gap: 8px;
		line-height: 1.3;
	}

	.reply-name {
		font-weight: var(--weight-medium);
	}

	.reply-meta time {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.reply-text {
		margin-top: 2px;
		line-height: 1.45;
		overflow-wrap: anywhere;
		white-space: pre-line;
	}

	.reply-text :global(a) {
		color: var(--colour-accent);
	}

	.reply-body form {
		margin: 0;
	}

	.reply-delete {
		min-height: 32px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--colour-text-faint);
		font-size: var(--text-caption);
	}

	.reply-form {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: end;
		gap: 10px;
		margin-top: var(--space-m);
	}

	.reply-form textarea {
		min-height: 52px;
		resize: none;
		field-sizing: content;
		max-height: 200px;
	}

	.send {
		min-width: 88px;
	}

	.reply-form .field-error {
		grid-column: 1 / -1;
	}
</style>
