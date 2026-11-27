<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { EMPTY } from '#lib/copy/voice.js';
	import ChoreRoster from '#lib/features/home/ChoreRoster.svelte';
	import ContactList from '#lib/features/home/ContactList.svelte';
	import WifiCard from '#lib/features/home/WifiCard.svelte';
	import { contactsFrom, otherNotes, wifiFrom } from '#lib/features/home/house-info.js';
	import NoteCard from '#lib/features/notes/NoteCard.svelte';
	import NotificationList from '#lib/features/notifications/NotificationList.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { kept } from '#lib/ui/kept.svelte.js';
	import { arrive, changed, glide, leave } from '#lib/ui/motion.js';
	import Reveal from '#lib/ui/Reveal.svelte';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The copy this phone kept until fresh data lands (src/lib/ui/kept.svelte.ts).
	const screen = kept(
		() => 'home',
		() => data.screen
	);

	// Said a little differently each visit (src/lib/copy/voice.ts).
	const emptyLine = pick(EMPTY.notes);

	// The Wi-Fi and phone numbers are read out of the notes (src/lib/features/home/house-info.ts).
	const allNotes = $derived(screen.current?.notes ?? []);
	const wifi = $derived(wifiFrom(allNotes));
	const contacts = $derived(contactsFrom(allNotes));
	const notes = $derived(otherNotes(allNotes, wifi, contacts));

	const FEEDBACK = 'brenton.weaver@gmail.com';

	// You, for the account button (top right, as in the App Store and Photos).
	const me = $derived(
		data.household.members.find((member) => member.id === data.me.id) ?? data.household.members[0]
	);
	const requests = $derived(data.requestsWaiting ?? 0);

	// The notification centre: the newest few, then the rest on /notifications.
	const SHOWN = 4;
	const notifications = $derived(screen.current?.notifications ?? []);

	// Once you've had a moment to look, they're seen: the Home tab's dot and the app icon's
	// count clear. The dots on the rows stay for this visit, so you can see what was new.
	onMount(() => {
		if (!data.unread) return;
		const timer = setTimeout(async () => {
			const response = await fetch('/notifications/seen', { method: 'POST' }).catch(() => null);
			if (response?.ok) await invalidate('app:unread');
		}, 1500);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>{data.household.name} · home base</title>
</svelte:head>

<!--
	Your face, top right, opens You & friends (your profile, friends and preferences), with a dot
	when a friend request is waiting: the iOS account button. Who lives here shows in the jobs
	below, so there's no separate row of faces.
-->
<PageHeader title={data.household.name}>
	{#snippet action()}
		<a
			class="me"
			href="/profile"
			aria-label={requests
				? `You & friends: ${requests} friend ${requests === 1 ? 'request' : 'requests'} waiting`
				: 'You & friends'}
		>
			<Avatar person={me} size={36} ring />
			{#if requests}<span class="dot" aria-hidden="true"></span>{/if}
		</a>
	{/snippet}
</PageHeader>

<Reveal of={screen} placeholder={[374, 282, 184]} gap={40} label="Loading home">
	{#snippet children(home)}
		<section aria-labelledby="new-heading">
			<div class="section-heading-row">
				<h2 id="new-heading" class="section-label section-heading">What’s new</h2>
				{#if notifications.length}<a class="section-heading-link" href="/notifications">See all</a
					>{/if}
			</div>
			{#if notifications.length === 0}
				<p class="empty">
					All quiet. Friend requests, postcards, replies and invites will show up here.
				</p>
			{:else}
				<NotificationList items={notifications.slice(0, SHOWN)} />
			{/if}
		</section>

		<section aria-labelledby="jobs-heading">
			<div class="section-heading-row">
				<h2 id="jobs-heading" class="section-label section-heading">This week’s jobs</h2>
				<a class="section-heading-link" href="/lists/tasks">All tasks</a>
			</div>
			{#if home.chores.length === 0}
				<p class="empty">Nothing due this week. Enjoy it.</p>
			{:else}
				<ChoreRoster
					chores={home.chores}
					people={data.household.members}
					scores={home.scores}
					meId={data.me.id}
				/>
			{/if}
		</section>

		<section aria-labelledby="info-heading">
			<h2 id="info-heading" class="section-label section-heading">House info</h2>
			<div class="info">
				{#if wifi}
					<WifiCard {wifi} />
				{/if}
				{#if contacts.length}
					<ContactList {contacts} />
				{/if}
				{#if !wifi || !contacts.length}
					<div class="starters">
						{#if !wifi}
							<a class="starter" href="/home/notes/new?template=wifi"
								><Icon name="wifi" size={18} /> Add the Wi-Fi</a
							>
						{/if}
						<a class="starter" href="/home/notes/new?template=contact"
							><Icon name="phone" size={18} /> Add a contact</a
						>
					</div>
				{:else}
					<a class="add-contact" href="/home/notes/new?template=contact">Add a contact</a>
				{/if}
			</div>
		</section>

		<section aria-labelledby="notes-heading">
			<div class="section-heading-row">
				<h2 id="notes-heading" class="section-label section-heading">Notes</h2>
				{#if notes.length}<a class="section-heading-link" href="/home/notes/new">New note</a>{/if}
			</div>
			{#if notes.length === 0}
				<p class="empty">{emptyLine}</p>
				<a class="button-secondary" href="/home/notes/new">Add a note</a>
			{:else}
				<div class="note-list">
					{#each notes as note (note.id)}
						<div in:arrive out:leave animate:glide use:changed={`${note.title}|${note.updatedAt}`}>
							<NoteCard {note} />
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/snippet}
</Reveal>

<section class="help" aria-labelledby="help-heading">
	<h2 id="help-heading" class="group-title">Help &amp; privacy</h2>
	<ul class="grouped">
		<li>
			<a
				class="grouped-row"
				href="mailto:{FEEDBACK}?subject={encodeURIComponent('home base feedback')}"
				><span class="grouped-label">Send feedback or ask for help</span><span
					class="grouped-chevron"><Icon name="chevron" size={16} /></span
				></a
			>
		</li>
		<li>
			<a class="grouped-row" href="/privacy"
				><span class="grouped-label">Privacy</span><span class="grouped-chevron"
					><Icon name="chevron" size={16} /></span
				></a
			>
		</li>
		<li>
			<a class="grouped-row" href="/account/export" download data-sveltekit-reload
				><span class="grouped-label">Download my data</span><span class="grouped-chevron"
					><Icon name="chevron" size={16} /></span
				></a
			>
		</li>
		<li>
			<a
				class="grouped-row"
				href="mailto:{FEEDBACK}?subject={encodeURIComponent(
					'Delete my home base account'
				)}&body={encodeURIComponent(
					'Please delete my home base account. I’m writing from the email address I signed up with.'
				)}"
				><span class="grouped-label">Delete my account</span><span class="grouped-chevron"
					><Icon name="chevron" size={16} /></span
				></a
			>
		</li>
	</ul>
	<p class="group-note">Deleting your account is done by email for now, within 30 days.</p>
</section>

<ul class="grouped more" aria-label="Account">
	<li>
		<a class="grouped-row" href="/profile"
			><span class="grouped-label">You &amp; friends</span><span class="grouped-chevron"
				><Icon name="chevron" size={16} /></span
			></a
		>
	</li>
	<li>
		<a class="grouped-row" href="/home/sitter"
			><span class="grouped-label">House-sitter link</span><span class="grouped-chevron"
				><Icon name="chevron" size={16} /></span
			></a
		>
	</li>
	<li>
		<a class="grouped-row" href="/home/settings"
			><span class="grouped-label">Home settings</span><span class="grouped-chevron"
				><Icon name="chevron" size={16} /></span
			></a
		>
	</li>
	{#if !data.sampleMode}
		<li>
			<form method="POST" action="/logout">
				<button class="grouped-row danger">Sign out</button>
			</form>
		</li>
	{/if}
</ul>

<style>
	/* The account button: a 44px target around your 36px face, with the request dot. */
	.me {
		position: relative;
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		margin-right: -4px;
		border-radius: 50%;
		transition: transform var(--duration-release) var(--spring-gentle);
	}

	.me:global([data-pressed]) {
		transform: scale(0.92);
		transition-duration: var(--duration-press);
	}

	.dot {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--colour-accent);
		box-shadow: 0 0 0 2px var(--colour-ground);
	}

	section {
		margin-top: var(--space-xl);
	}

	/* A bold heading with a tinted link beside it, as in Health's Summary. */
	.section-label {
		margin-bottom: var(--space-s);
	}

	.empty {
		max-width: 32ch;
		margin-bottom: var(--space-m);
		color: var(--colour-text-muted);
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.starters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 10px;
	}

	.starter {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 52px;
		border-radius: 16px;
		background: var(--colour-fill);
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
		font-size: var(--text-small);
		color: var(--colour-text);
		text-decoration: none;
	}

	.starter :global(.icon) {
		color: var(--colour-accent);
	}

	.add-contact {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		min-height: 36px;
		font-size: var(--text-small);
		color: var(--colour-accent);
		text-decoration: none;
	}

	.note-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.help {
		margin-top: var(--space-2xl);
	}

	.more {
		margin-top: var(--space-xl);
	}

	.more form {
		margin: 0;
	}
</style>
