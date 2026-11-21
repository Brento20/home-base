<script lang="ts">
	/**
	 * Your profile as friends see it (your colour, photo, name and the line about you), then your
	 * friends, then your home's latest postcards, sent and received. Friends are added by link:
	 * make one here, send it, and whoever opens it becomes your friend (src/routes/friend/[token]).
	 * Links nobody has used yet can be cancelled; people you've blocked can be unblocked.
	 */
	import { enhance } from '$app/forms';
	import PostcardList from '#lib/features/friends/PostcardList.svelte';
	import PublicFieldsCard from '#lib/features/friends/PublicFieldsCard.svelte';
	import { filledFields } from '#lib/features/friends/public-profile.js';
	import ProfileHeader from '#lib/features/friends/ProfileHeader.svelte';
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

	const facts = $derived([
		{ icon: 'home' as const, text: data.household.name },
		...(account.pronouns ? [{ text: account.pronouns }] : [])
	]);
	const nameOf = (id: string | null) =>
		data.friends.find((friend) => friend.id === id)?.name ?? null;

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
	<ProfileHeader person={me} name={shownName} bio={data.publicProfile.bio} {facts} />

	<section aria-labelledby="public-heading">
		<div class="section-heading-row">
			<h2 id="public-heading" class="section-heading">Public profile</h2>
			<a class="section-heading-link" href="/profile/public">Edit</a>
		</div>
		{#if filledFields(data.publicProfile.fields).length}
			<PublicFieldsCard fields={data.publicProfile.fields} label="Your public profile" />
			<p class="group-note">Anyone on home base can see these, friends or not.</p>
		{:else}
			<p class="empty">
				Add a few things people can see before they’re your friends, like what you’re known for or
				your favourite local spot. <a href="/profile/public">Fill it in</a>
			</p>
		{/if}
	</section>

	<section aria-labelledby="friends-heading">
		<div class="section-heading-row">
			<h2 id="friends-heading" class="section-heading">
				Friends{#if data.friends.length}<span class="count">{data.friends.length}</span>{/if}
			</h2>
			<a class="section-heading-link" href="#add-heading">Add</a>
		</div>
		{#if data.friends.length}
			<ul class="friends">
				{#each data.friends as friend (friend.id)}
					<li>
						<a class="friend" href="/profile/{friend.id}">
							<Avatar
								person={{
									displayName: friend.name,
									initials: friend.initials,
									accentColour: friend.colour,
									avatarUrl: friend.avatarUrl
								}}
								size={60}
								ring
							/>
							<span class="friend-name">{friend.name}</span>
							<span class="friend-home">{friend.homeName ?? ''}</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">
				No friends here yet. Make a friend link below and they’ll turn up here once they open it.
			</p>
		{/if}
	</section>

	{#if data.postcards.length}
		<section aria-labelledby="postcards-heading">
			<h2 id="postcards-heading" class="section-heading">Postcards</h2>
			<PostcardList postcards={data.postcards} me={data.me.id} {nameOf} />
		</section>
	{/if}

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

	.count {
		margin-left: 8px;
		font-weight: var(--weight-regular);
		color: var(--colour-text-faint);
	}

	/* Faces in a grid, four across on a phone. */
	.friends {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
		gap: 14px 8px;
		margin: var(--space-s) 0 0;
		padding: 0;
		list-style: none;
	}

	.friend {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 6px 0;
		border-radius: 16px;
		color: inherit;
		text-align: center;
		text-decoration: none;
	}

	.friend-name {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
	}

	.friend-home {
		max-width: 100%;
		margin-top: -4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
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
