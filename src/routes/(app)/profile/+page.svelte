<script lang="ts">
	/**
	 * You & friends, laid out like the iPhone's account page: who you are at the top, a few clear
	 * rows, then the social part.
	 * - Your card (photo, name, the line about you, your public answers) and Edit profile, which
	 *   edits everything other people see.
	 * - Preferences (how the app looks to you) and Details and account (the private part).
	 * - Friend requests waiting on you, your friends, postcards, and Add a friend three ways: type
	 *   their code, share yours, or send a friend link.
	 * - Manage friends: requests and links you've sent, and people you've blocked.
	 */
	import { enhance } from '$app/forms';
	import { save, saveForm } from '#lib/ui/save.svelte.js';
	import PostcardList from '#lib/features/friends/PostcardList.svelte';
	import PublicFieldsCard from '#lib/features/friends/PublicFieldsCard.svelte';
	import { filledFields } from '#lib/features/friends/public-profile.js';
	import ProfileHeader from '#lib/features/friends/ProfileHeader.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import ShareLink from '#lib/ui/ShareLink.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const making = save();
	let copied = $state(false);

	const incoming = $derived(data.requests.filter((request) => request.incoming));
	// For the Manage friends row: what's in there, so it's worth a look.
	const waiting = $derived(
		[
			data.manage.sent && `${data.manage.sent} sent`,
			data.manage.links && `${data.manage.links} ${data.manage.links === 1 ? 'link' : 'links'}`,
			data.manage.blocked && `${data.manage.blocked} blocked`
		]
			.filter(Boolean)
			.join(' · ')
	);

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(data.code);
			copied = true;
		} catch {
			// Clipboard refused: the code is on screen to read out.
		}
	}

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

	// As friends see it: pronouns are private for now, so they're not on the card.
	const facts = $derived([{ icon: 'home' as const, text: data.household.name }]);
	const nameOf = (id: string | null) =>
		data.friends.find((friend) => friend.id === id)?.name ?? null;

	// A new code: the old one's “Copied” goes.
	const swapping = save({
		reset: true,
		start: () => {
			copied = false;
		}
	});
</script>

<svelte:head>
	<title>{shownName} · home base</title>
</svelte:head>

<PageHeader title="You &amp; friends">
	{#snippet lead()}
		<a class="button-quiet" href="/home"><Icon name="back" size={18} /> Home</a>
	{/snippet}
</PageHeader>

<div class="stack">
	<!-- Requests waiting on you come first: they're the thing to act on. -->
	{#if incoming.length}
		<section aria-labelledby="requests-heading">
			<h2 id="requests-heading" class="section-heading">
				Friend requests<span class="count">{incoming.length}</span>
			</h2>
			<ul class="grouped">
				{#each incoming as request (request.id)}
					<li class="grouped-row request">
						<a class="request-who" href="/people/{request.id}">
							<Avatar
								person={{
									displayName: request.name,
									initials: request.initials,
									accentColour: request.colour,
									avatarUrl: null
								}}
								size={36}
							/>
							<span class="grouped-label">
								{request.name}
								<span class="grouped-sub">{request.homeName ?? 'Not in a home yet'}</span>
							</span>
						</a>
						<form class="request-answer" method="POST" action="?/answer" use:enhance={saveForm}>
							<input type="hidden" name="person" value={request.id} />
							<button class="button-quiet" name="accept" value="no">Decline</button>
							<button class="button-primary small" name="accept" value="yes">Accept</button>
						</form>
					</li>
				{/each}
			</ul>
			{#if form?.answer?.message}<p class="field-error" role="alert">{form.answer.message}</p>{/if}
		</section>
	{/if}

	<!-- Your card, as other people see it, and the one way to change it. -->
	<section class="card" aria-label="Your profile">
		<ProfileHeader person={me} name={shownName} bio={data.publicProfile.bio} {facts} />
		{#if filledFields(data.publicProfile.fields).length}
			<PublicFieldsCard fields={data.publicProfile.fields} label="Your public profile" />
		{:else}
			<p class="empty">
				Add a few things people can see before they’re your friends, like what you’re known for or
				your favourite local spot.
			</p>
		{/if}
		<a class="button-secondary edit" href="/profile/edit">Edit profile</a>
	</section>

	<ul class="grouped" aria-label="Settings for you">
		<li>
			<a class="grouped-row" href="/profile/preferences"
				><span class="grouped-label"
					>Preferences<span class="grouped-sub">How home base looks to you</span></span
				><span class="grouped-chevron"><Icon name="chevron" size={16} /></span></a
			>
		</li>
		<li>
			<a class="grouped-row" href="/profile/details"
				><span class="grouped-label"
					>Details and account<span class="grouped-sub"
						>Name, pronouns, birthday, email, password</span
					></span
				><span class="grouped-chevron"><Icon name="chevron" size={16} /></span></a
			>
		</li>
	</ul>

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
			<div class="form-stack">
				<form method="POST" action="?/requestCode" class="code-form" use:enhance={saveForm}>
					<label class="field">
						<span class="field-label">Their friend code</span>
						<span class="code-row">
							<input
								class="field-input code-input"
								name="code"
								placeholder="FIG-42Q"
								autocomplete="off"
								autocapitalize="characters"
								spellcheck="false"
								maxlength="8"
								value={form?.byCode?.code ?? ''}
							/>
							<button class="button-primary">Send request</button>
						</span>
					</label>
					{#if form?.byCode?.message}
						<p class="field-error" role="alert">{form.byCode.message}</p>
					{:else if form?.byCode?.done}
						<p class="done" role="status">{form.byCode.done}</p>
					{/if}
				</form>

				<div class="your-code">
					<span class="field-label">Your friend code</span>
					<span class="code-row">
						<span class="code" aria-label="Your friend code: {data.code.split('').join(' ')}"
							>{data.code}</span
						>
						<button class="button-quiet" type="button" onclick={copyCode}
							>{copied ? 'Copied' : 'Copy'}</button
						>
						<form method="POST" action="?/newCode" use:enhance={swapping.enhance}>
							<button class="button-quiet">New code</button>
						</form>
					</span>
					<span class="field-hint">
						Give it to a friend to type in here. Get a new one any time; the old one stops working.
					</span>
				</div>

				<form method="POST" action="?/link" class="link-form" use:enhance={making.enhance}>
					<span class="field-label">Not on home base yet?</span>
					<p class="explain">
						Send them a friend link. It works for one person and lasts two weeks.
					</p>
					{#if form?.link?.message}<p class="field-error" role="alert">{form.link.message}</p>{/if}
					<button class="button-secondary" disabled={making.busy}>
						{making.busy ? 'Making a link…' : 'Make a friend link'}
					</button>
				</form>
			</div>
			{#if form?.link?.url}
				<ShareLink link={form.link.url} title="Be my friend on home base" label="Friend link" />
			{/if}
		</GlassCard>
	</section>

	<ul class="grouped" aria-label="More about friends">
		<li>
			<a class="grouped-row" href="/profile/manage"
				><span class="grouped-label"
					>Manage friends<span class="grouped-sub"
						>{waiting || 'Requests you’ve sent, friend links and blocked people'}</span
					></span
				><span class="grouped-chevron"><Icon name="chevron" size={16} /></span></a
			>
		</li>
	</ul>
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

	.request {
		gap: 10px;
	}

	.request-who {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 12px;
		min-width: 0;
		color: inherit;
		text-decoration: none;
	}

	.request-answer {
		display: flex;
		flex: none;
		align-items: center;
		gap: 4px;
	}

	.small {
		min-height: 36px;
		padding: 0 14px;
	}

	.code-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.code-input {
		flex: 1;
		min-width: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.your-code,
	.link-form {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: var(--space-m);
		border-top: var(--hairline) solid var(--colour-separator);
	}

	.code {
		flex: 1;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: var(--text-headline);
		font-weight: var(--weight-strong);
		letter-spacing: 0.08em;
	}

	.link-form .button-secondary {
		align-self: flex-start;
	}

	.done {
		color: var(--colour-accent);
	}

	.explain {
		color: var(--colour-text-muted);
	}

	.empty {
		margin: 0 16px;
		color: var(--colour-text-muted);
	}

	/* Your card, then its one button, full width as on an iPhone contact card. */
	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
	}

	.edit {
		justify-content: center;
		text-decoration: none;
	}
</style>
