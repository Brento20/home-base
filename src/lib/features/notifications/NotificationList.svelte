<script lang="ts">
	/**
	 * Notifications as rows: who (their face, with a small badge for what kind it is), what
	 * happened, and when. Ones you hadn't seen when the page opened carry an accent dot. A friend
	 * request answers right here; everything else opens what it's about (through
	 * /notifications/[id], which marks it read on the way).
	 */
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { homeSettings } from '#lib/home.js';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { GlyphId } from '#lib/icons/glyphs.js';
	import { describeNotification, type AppNotification, type NotificationKind } from './describe.js';

	interface Props {
		items: AppNotification[];
		/** Where a friend request's yes or no is posted (a page with an `answer` action). */
		answerAction?: string;
	}

	let { items, answerAction = '?/answer' }: Props = $props();

	const KIND_ICON: Record<NotificationKind, GlyphId> = {
		friend_request: 'users',
		friend_accepted: 'users',
		postcard: 'post',
		postcard_reply: 'chat-bubbles',
		postcard_reaction: 'heart',
		feed_post: 'create-post',
		feed_reply: 'chat-bubbles',
		feed_reaction: 'heart',
		plan_invite: 'calendar',
		plan_response: 'calendar',
		expense: 'wallet',
		settlement: 'wallet',
		task_assigned: 'checklist'
	};

	let answering = $state<string | null>(null);

	/** How long ago, as iOS puts it in Notification Centre: "now", "14m", "3h", "Mon", "4 Nov". */
	function ago(createdAt: string, now = Date.now()) {
		const instant = new Date(createdAt);
		const minutes = Math.floor((now - instant.getTime()) / 60_000);
		if (minutes < 1) return 'now';
		if (minutes < 60) return `${minutes}m`;
		if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
		const options: Intl.DateTimeFormatOptions =
			minutes < 7 * 24 * 60 ? { weekday: 'short' } : { day: 'numeric', month: 'short' };
		return new Intl.DateTimeFormat('en-AU', { ...options, timeZone }).format(instant);
	}
	const timeZone = $derived(homeSettings().timeZone);
</script>

<ul class="grouped notifications">
	{#each items as item (item.id)}
		{@const words = describeNotification(item, timeZone)}
		{@const person = {
			id: item.actorId ?? item.id,
			displayName: item.actorName,
			initials: item.actorInitials,
			accentColour: item.actorColour,
			avatarUrl: null
		}}
		<li class:unread={!item.read}>
			{#if item.kind === 'friend_request' && item.actorId}
				<div class="row">
					<span class="face"
						><Avatar {person} size={40} /><span class="kind"
							><Icon name={KIND_ICON[item.kind]} size={12} /></span
						></span
					>
					<span class="words">
						<span class="title">{words.title}</span>
					</span>
					<span class="when">{ago(item.createdAt)}</span>
					<form
						class="answer"
						method="POST"
						action={answerAction}
						use:enhance={() => {
							answering = item.id;
							return async ({ update }) => {
								await update({ reset: false });
								await invalidateAll();
								answering = null;
							};
						}}
					>
						<input type="hidden" name="person" value={item.actorId} />
						<button
							class="button-primary small"
							name="accept"
							value="yes"
							disabled={answering === item.id}>Accept</button
						>
						<button
							class="button-secondary small"
							name="accept"
							value="no"
							disabled={answering === item.id}>Not now</button
						>
					</form>
				</div>
			{:else}
				<a class="row" href="/notifications/{item.id}" data-sveltekit-preload-data="false">
					<span class="face"
						><Avatar {person} size={40} /><span class="kind"
							><Icon name={KIND_ICON[item.kind]} size={12} /></span
						></span
					>
					<span class="words">
						<span class="title">{words.title}</span>
						{#if words.body}<span class="body">{words.body}</span>{/if}
					</span>
					<span class="when">{ago(item.createdAt)}</span>
				</a>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.notifications li {
		position: relative;
	}

	.row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: start;
		gap: 12px;
		padding: 12px 16px;
		color: inherit;
		text-decoration: none;
	}

	.face {
		position: relative;
		flex: none;
	}

	/* What kind it is, as a small badge on their face, cut out of the card behind it. */
	.kind {
		position: absolute;
		right: -4px;
		bottom: -3px;
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background:
			linear-gradient(var(--colour-fill-strong), var(--colour-fill-strong)), var(--colour-ground);
		box-shadow: 0 0 0 2px var(--colour-ground);
		color: var(--colour-text-muted);
	}

	.words {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		padding-top: 1px;
	}

	.title {
		font-size: var(--text-small);
		line-height: 1.3;
		font-weight: var(--weight-medium);
	}

	.body {
		overflow: hidden;
		font-size: var(--text-caption);
		line-height: 1.35;
		color: var(--colour-text-muted);
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.when {
		padding-top: 2px;
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
		white-space: nowrap;
	}

	/* New since you last looked: brighter words and an accent dot by the time. */
	.unread .title {
		font-weight: var(--weight-strong);
	}

	.unread .when {
		position: relative;
		padding-right: 14px;
		color: var(--colour-accent);
	}

	.unread .when::after {
		content: '';
		position: absolute;
		top: 7px;
		right: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--colour-accent);
	}

	/* Under the words, across the time's column too, so both buttons fit on one line. */
	.answer {
		grid-column: 2 / -1;
		display: flex;
		gap: 8px;
		margin-top: -4px;
	}

	.small {
		min-height: 34px;
		padding: 0 14px;
		font-size: var(--text-small);
	}
</style>
