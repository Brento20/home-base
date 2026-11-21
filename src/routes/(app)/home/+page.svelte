<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { EMPTY } from '#lib/copy/voice.js';
	import ChoreRoster from '#lib/features/home/ChoreRoster.svelte';
	import ContactList from '#lib/features/home/ContactList.svelte';
	import WifiCard from '#lib/features/home/WifiCard.svelte';
	import { contactsFrom, otherNotes, wifiFrom } from '#lib/features/home/house-info.js';
	import NoteCard from '#lib/features/notes/NoteCard.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import RoundButton from '#lib/ui/RoundButton.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Said a little differently each visit (src/lib/copy/voice.ts).
	const emptyLine = pick(EMPTY.notes);

	// The Wi-Fi and phone numbers are read out of the notes (src/lib/features/home/house-info.ts).
	const wifi = $derived(wifiFrom(data.notes));
	const contacts = $derived(contactsFrom(data.notes));
	const notes = $derived(otherNotes(data.notes, wifi, contacts));

	const FEEDBACK = 'brenton.weaver@gmail.com';
</script>

<svelte:head>
	<title>{data.household.name} · home base</title>
</svelte:head>

<PageHeader title={data.household.name}>
	{#snippet action()}
		<RoundButton icon="plus" label="New note" href="/home/notes/new" />
	{/snippet}
</PageHeader>

<a class="people" href="/home/settings" aria-label="Everyone in {data.household.name}">
	{#each data.household.members as person (person.id)}
		<span class="person">
			<Avatar {person} size={52} ring />
			<span class="name">{person.displayName}</span>
		</span>
	{/each}
</a>

<section aria-labelledby="jobs-heading">
	<div class="section-head">
		<h2 id="jobs-heading" class="section-label">This week’s jobs</h2>
		<a class="section-link" href="/lists/tasks">All tasks</a>
	</div>
	{#if data.chores.length === 0}
		<p class="empty">Nothing due this week. Enjoy it.</p>
	{:else}
		<ChoreRoster
			chores={data.chores}
			people={data.household.members}
			scores={data.scores}
			meId={data.me.id}
		/>
	{/if}
</section>

<section aria-labelledby="info-heading">
	<h2 id="info-heading" class="section-label">House info</h2>
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
	<h2 id="notes-heading" class="section-label">Notes</h2>
	{#if notes.length === 0}
		<p class="empty">{emptyLine}</p>
		<a class="button-secondary" href="/home/notes/new">Add a note</a>
	{:else}
		<div class="note-list">
			{#each notes as note (note.id)}
				<NoteCard {note} />
			{/each}
		</div>
	{/if}
</section>

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
		<a class="grouped-row" href="/home/profile"
			><span class="grouped-label">Edit your profile</span><span class="grouped-chevron"
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
	.people {
		display: flex;
		gap: var(--space-m);
		margin: calc(var(--space-s) * -1) -6px 0;
		padding: 6px;
		overflow-x: auto;
		color: inherit;
		text-decoration: none;
		scrollbar-width: none;
	}

	.person {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		min-width: 60px;
	}

	.name {
		max-width: 64px;
		overflow: hidden;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	section {
		margin-top: var(--space-xl);
	}

	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	/* A bold heading with a tinted link beside it, as in Health's Summary. */
	.section-label {
		font-size: var(--text-headline);
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		color: var(--colour-text);
		margin-bottom: var(--space-s);
	}

	.section-link {
		font-size: var(--text-small);
		color: var(--colour-accent);
		text-decoration: none;
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
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
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
