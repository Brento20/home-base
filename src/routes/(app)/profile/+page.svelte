<script lang="ts">
	/**
	 * Your profile as friends see it, with your friends below. Friends are added by link: make
	 * one here, send it, and whoever opens it becomes your friend (src/routes/friend/[token]).
	 * Links nobody has used yet can be cancelled; people you've blocked can be unblocked.
	 */
	import { enhance } from '$app/forms';
	import Avatar from '#lib/ui/Avatar.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import ShareLink from '#lib/ui/ShareLink.svelte';
	import { formatDayLabel, todayISO } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let making = $state(false);

	const account = $derived(data.account);
	const fullName = $derived(
		[account.firstName, account.lastName].filter(Boolean).join(' ') || data.me.displayName
	);
	const shownName = $derived(account.nickname || fullName);
	const me = $derived({
		displayName: shownName,
		initials: data.me.initials,
		accentColour: account.accentColour,
		avatarUrl: account.avatarUrl
	});

	// "Expires Saturday", "Expires Sat 29 Nov".
	const expires = (instant: string) => {
		const label = formatDayLabel(todayISO(new Date(instant)));
		return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : label;
	};
</script>

<svelte:head>
	<title>{shownName} · home base</title>
</svelte:head>

<PageHeader title="You">
	{#snippet lead()}
		<a class="button-quiet" href="/home"><Icon name="back" size={18} /> Home</a>
	{/snippet}
	{#snippet trailing()}
		<a class="button-quiet" href="/home/profile">Edit</a>
	{/snippet}
</PageHeader>

<div class="stack">
	<section class="card-hero" aria-label="Your profile">
		<Avatar person={me} size={88} ring />
		<div class="who">
			<p class="name">{shownName}</p>
			{#if account.nickname && fullName !== account.nickname}<p class="sub">{fullName}</p>{/if}
			{#if account.pronouns}<p class="sub">{account.pronouns}</p>{/if}
			<p class="sub home"><Icon name="home" size={14} /> {data.household.name}</p>
		</div>
	</section>

	<section aria-labelledby="friends-heading">
		<h2 id="friends-heading" class="group-title">Friends</h2>
		{#if data.friends.length}
			<ul class="grouped">
				{#each data.friends as friend (friend.id)}
					<li>
						<a class="grouped-row" href="/profile/{friend.id}">
							<span class="grouped-icon avatar-slot">
								<Avatar
									person={{
										displayName: friend.name,
										initials: friend.initials,
										accentColour: friend.colour,
										avatarUrl: friend.avatarUrl
									}}
									size={30}
								/>
							</span>
							<span class="grouped-label">
								{friend.name}
								<span class="grouped-sub">{friend.homeName ?? 'Not in a home yet'}</span>
							</span>
							<span class="grouped-chevron"><Icon name="chevron" size={16} /></span>
						</a>
					</li>
				{/each}
			</ul>
			<p class="group-note">
				Friends see your name, photo and home’s name, and can send postcards to your home’s feed.
				Nothing else.
			</p>
		{:else}
			<p class="empty">
				No friends here yet. Send someone a friend link and they’ll turn up here once they open it.
			</p>
		{/if}
	</section>

	<section aria-labelledby="add-heading">
		<h2 id="add-heading" class="group-title">Add a friend</h2>
		<GlassCard>
			<form
				method="POST"
				action="?/link"
				class="form-stack"
				use:enhance={() => {
					making = true;
					return async ({ update }) => {
						await update({ reset: false });
						making = false;
					};
				}}
			>
				<p class="explain">
					A friend link works for one person and lasts two weeks. They’ll need a home base account.
				</p>
				{#if form?.link?.message}<p class="field-error" role="alert">{form.link.message}</p>{/if}
				<button class="button-primary" disabled={making}>
					{making ? 'Making a link…' : 'Make a friend link'}
				</button>
			</form>
			{#if form?.link?.url}
				<ShareLink link={form.link.url} title="Be my friend on home base" label="Friend link" />
			{/if}
		</GlassCard>
	</section>

	{#if data.links.length}
		<section aria-labelledby="waiting-heading">
			<h2 id="waiting-heading" class="group-title">Links waiting to be opened</h2>
			<ul class="grouped">
				{#each data.links as link (link.id)}
					<li class="grouped-row">
						<span class="grouped-label">
							Friend link
							<span class="grouped-sub">Expires {expires(link.expiresAt)}</span>
						</span>
						<form method="POST" action="?/revoke" use:enhance>
							<input type="hidden" name="id" value={link.id} />
							<button class="button-quiet danger">Cancel</button>
						</form>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.blocked.length}
		<section aria-labelledby="blocked-heading">
			<h2 id="blocked-heading" class="group-title">Blocked</h2>
			<ul class="grouped">
				{#each data.blocked as person (person.id)}
					<li class="grouped-row">
						<span class="grouped-label">{person.name}</span>
						<form method="POST" action="?/unblock" use:enhance>
							<input type="hidden" name="id" value={person.id} />
							<button class="button-quiet">Unblock</button>
						</form>
					</li>
				{/each}
			</ul>
			<p class="group-note">
				Blocked people can’t add you or send postcards. Unblocking doesn’t make you friends again.
			</p>
		</section>
	{/if}
</div>

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-l);
	}

	.card-hero {
		display: flex;
		align-items: center;
		gap: var(--space-m);
		padding: 4px;
	}

	.who {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.name {
		font-size: var(--text-headline);
		font-weight: var(--weight-strong);
		line-height: 1.2;
	}

	.sub {
		color: var(--colour-text-muted);
	}

	.home {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.avatar-slot {
		background: none;
	}

	.explain {
		color: var(--colour-text-muted);
	}

	.empty {
		margin: 0 16px;
		color: var(--colour-text-muted);
	}

	.danger {
		color: var(--colour-danger);
	}
</style>
