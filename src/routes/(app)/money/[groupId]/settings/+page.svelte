<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import { enhance } from '$app/forms';
	import Avatar from '#lib/ui/Avatar.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.groupSettings);
	let busy = $state<'rename' | 'add' | null>(null);

	const outsiders = $derived(
		data.household.members.filter((person) => !data.group.memberIds.includes(person.id))
	);

	const submitting = (which: 'rename' | 'add') => () => {
		busy = which;
		return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: which === 'add' });
			busy = null;
		};
	};
</script>

<svelte:head>
	<title>Group settings · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/money/{data.group.id}"
			><Icon name="back" size={18} /> {data.group.name}</a
		>
	{/snippet}
</PageHeader>

<div class="stack">
	<GlassCard>
		<form method="POST" action="?/rename" class="form-stack" use:enhance={submitting('rename')}>
			<label class="field">
				<span class="field-label">Group name</span>
				<input
					class="field-input"
					name="name"
					value={form?.rename?.name ?? data.group.name}
					maxlength="40"
					required
					aria-invalid={form?.rename?.message ? 'true' : undefined}
				/>
				{#if form?.rename?.message}<span class="field-error">{form.rename.message}</span>
				{:else if form?.rename && 'saved' in form.rename}<span class="field-hint">Saved.</span>{/if}
			</label>
			<button class="button-secondary" disabled={busy === 'rename'}>
				{busy === 'rename' ? 'Saving…' : 'Rename group'}
			</button>
		</form>
	</GlassCard>

	<section aria-labelledby="members-heading">
		<h2 id="members-heading" class="section-label caption-label">In this group</h2>
		<ul class="people">
			{#each data.people as person (person.id)}
				<li>
					<Avatar {person} size={36} />
					<span>{person.displayName}{person.id === data.me.id ? ' (you)' : ''}</span>
				</li>
			{/each}
		</ul>
	</section>

	{#if outsiders.length > 0}
		<GlassCard>
			<form method="POST" action="?/add" class="form-stack" use:enhance={submitting('add')}>
				<fieldset class="field">
					<legend class="field-label">Add from your home</legend>
					<div class="choice-pills">
						{#each outsiders as person (person.id)}
							<label class="choice-pill">
								<input type="checkbox" name="members" value={person.id} />
								<Avatar {person} size={22} dot />
								{person.displayName}
							</label>
						{/each}
					</div>
					{#if form?.add?.message}<span class="field-error">{form.add.message}</span>{/if}
				</fieldset>
				<button class="button-secondary" disabled={busy === 'add'}>
					{busy === 'add' ? 'Adding…' : 'Add to group'}
				</button>
			</form>
		</GlassCard>
	{:else}
		<p class="note">Everyone in your home is in this group.</p>
	{/if}
</div>

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-l);
	}

	.section-label {
		margin-bottom: var(--space-m);
	}

	.people {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 0;
		list-style: none;
	}

	.people li {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.note {
		color: var(--colour-text-muted);
	}
</style>
