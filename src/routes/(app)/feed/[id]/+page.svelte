<script lang="ts">
	import { enhance } from '$app/forms';
	import PostCard from '#lib/features/feed/PostCard.svelte';
	import LinkedText from '#lib/features/plans/LinkedText.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { formatPostTime } from '#lib/time.js';
	import type { Profile } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const post = $derived(data.post);
	const people = $derived(data.household.members);

	const someone: Pick<Profile, 'displayName' | 'initials' | 'accentColour' | 'avatarUrl'> = {
		displayName: 'Someone',
		initials: '?',
		accentColour: 'var(--chart-other)',
		avatarUrl: null
	};
	const personFor = (id: string | null) => people.find((person) => person.id === id) ?? someone;
	const nameFor = (id: string | null) => (id === data.me.id ? 'You' : personFor(id).displayName);

	let reply = $state('');
	let sending = $state(false);
	let armedReply = $state<string | null>(null);
	let list = $state<HTMLElement>();
</script>

<svelte:head>
	<title>{nameFor(post.authorId)}’s post · home base</title>
</svelte:head>

<nav class="top-bar" aria-label="Post">
	<a class="button-quiet back" href="/"><Icon name="back" size={18} /> Today</a>
</nav>

<PostCard {post} {people} me={data.me.id} full />

<section class="conversation" aria-labelledby="replies-heading">
	<h2 id="replies-heading" class="section-label">
		{post.replies.length === 0
			? 'No replies yet'
			: `${post.replies.length} ${post.replies.length === 1 ? 'reply' : 'replies'}`}
	</h2>

	{#if post.replies.length > 0}
		<ol class="replies" bind:this={list}>
			{#each post.replies as entry (entry.id)}
				<li class="reply">
					<Avatar person={personFor(entry.authorId)} size={30} />
					<div class="reply-body">
						<p class="reply-meta">
							<span class="reply-name">{nameFor(entry.authorId)}</span>
							<time datetime={entry.createdAt}>{formatPostTime(new Date(entry.createdAt))}</time>
						</p>
						<p class="reply-text"><LinkedText text={entry.body} /></p>
						{#if entry.authorId === data.me.id}
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
			maxlength={data.replyMax}
			placeholder="Reply…"
			bind:value={reply}
			aria-invalid={form?.replyProblem ? 'true' : undefined}></textarea>
		<button class="button-primary send" disabled={sending || !reply.trim()}>
			{sending ? 'Sending…' : 'Send'}
		</button>
		{#if form?.replyProblem}<span class="field-error">{form.replyProblem}</span>{/if}
	</form>
</section>

<style>
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: -10px 0 var(--space-m) -4px;
	}

	.conversation {
		margin-top: var(--space-l);
	}

	.section-label {
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-text-muted);
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
