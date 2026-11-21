<script lang="ts">
	/**
	 * What a house-sitter sees: a message from the home, the Wi-Fi and numbers from the notes picked
	 * for them, the other notes, and the chores until the link ends. Read-only, no account, and
	 * nothing the home didn't pick. Secret notes stay dotted until tapped, as they do at home.
	 */
	import ContactList from '#lib/features/home/ContactList.svelte';
	import WifiCard from '#lib/features/home/WifiCard.svelte';
	import { contactsFrom, otherNotes, wifiFrom } from '#lib/features/home/house-info.js';
	import { repeatLabel } from '#lib/features/tasks/repeat.js';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import { formatDayLabel, todayISO } from '#lib/time.js';
	import type { HomeNote } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const page = $derived(data.page);
	const notes = $derived<HomeNote[]>(
		(page?.notes ?? []).map((note) => ({ ...note, updatedAt: '' }))
	);
	const wifi = $derived(wifiFrom(notes));
	// The home picked these notes for the sitter, secret or not, so their numbers are shown too.
	const contacts = $derived(contactsFrom(notes.map((note) => ({ ...note, isSecret: false }))));
	const rest = $derived(otherNotes(notes, wifi, contacts));
	// "today", "tomorrow", "Saturday", "Sat 29 Nov": the last day it works.
	const lastDay = $derived.by(() => {
		if (!page) return '';
		const label = formatDayLabel(todayISO(new Date(Date.parse(page.expiresAt) - 1)));
		return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : label;
	});

	let shown = $state<Record<string, boolean>>({});
</script>

<svelte:head>
	<title>{page ? `Looking after ${page.homeName}` : 'House-sitter link'} · home base</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if !page}
	<SoloScreen
		title="This link has ended"
		lead="House-sitter links stop at the end of their last day, or when the home stops them. Ask whoever sent it if you still need it."
	/>
{:else}
	<SoloScreen
		title="Looking after {page.homeName}"
		lead="From {page.sharedBy}{page.label
			? ` for ${page.label}`
			: ''}. This page works until the end of {lastDay}."
	>
		<div class="stack">
			{#if page.message}
				<GlassCard>
					<p class="message">{page.message}</p>
				</GlassCard>
			{/if}

			{#if wifi}<WifiCard {wifi} readonly />{/if}
			{#if contacts.length}
				<section aria-labelledby="numbers-heading">
					<h2 id="numbers-heading" class="group-title">Numbers</h2>
					<ContactList {contacts} readonly />
				</section>
			{/if}

			{#if rest.length}
				<section aria-labelledby="notes-heading">
					<h2 id="notes-heading" class="group-title">Notes</h2>
					<ul class="grouped">
						{#each rest as note (note.id)}
							<li class="note">
								<p class="note-title">{note.title}</p>
								{#if note.locked}
									<p class="note-body muted">This note is locked. Ask {page.sharedBy}.</p>
								{:else if note.isSecret && !shown[note.id]}
									<button class="button-quiet reveal" onclick={() => (shown[note.id] = true)}>
										•••••• Tap to show
									</button>
								{:else}
									<p class="note-body">{note.body}</p>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if page.chores.length}
				<section aria-labelledby="chores-heading">
					<h2 id="chores-heading" class="group-title">Jobs while you’re there</h2>
					<ul class="grouped">
						{#each page.chores as chore, index (index)}
							<li class="grouped-row">
								<span class="grouped-label">
									{chore.title}
									<span class="grouped-sub">
										{formatDayLabel(chore.dueOn)}{repeatLabel(chore.repeat)
											? ` · ${repeatLabel(chore.repeat)}`
											: ''}{chore.who ? ` · usually ${chore.who}` : ''}
									</span>
								</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>

		{#snippet footer()}
			<p class="footnote">Shared from home base. Please don’t pass this link on.</p>
		{/snippet}
	</SoloScreen>
{/if}

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-l);
		text-align: left;
	}

	.message,
	.note-body {
		white-space: pre-line;
		overflow-wrap: anywhere;
	}

	.note {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px 16px;
	}

	.note-title {
		font-weight: var(--weight-medium);
	}

	.muted {
		color: var(--colour-text-muted);
	}

	.reveal {
		align-self: flex-start;
		padding: 0;
	}

	.footnote {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
		text-align: center;
	}
</style>
