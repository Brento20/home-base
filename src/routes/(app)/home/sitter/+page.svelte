<script lang="ts">
	/**
	 * House-sitter links: pick what someone looking after the place needs (a message, which notes,
	 * the chores) and until when, then send them the link. They see one read-only page with only
	 * that, no account needed (src/routes/sitter/[token]). Money never appears on it. Links can be
	 * stopped here at any time.
	 */
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { save, saveForm } from '#lib/ui/save.svelte.js';
	import {
		SITTER_LABEL_MAX,
		SITTER_MAX_DAYS,
		SITTER_MESSAGE_MAX
	} from '#lib/features/sitter/sitter.js';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import ShareLink from '#lib/ui/ShareLink.svelte';
	import { addDays, formatDayLabel, todayISO } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const making = save();

	// What was filled in, if it bounced back with a problem.
	const sent = untrack(() => form?.create?.values);
	const picked = new Set(untrack(() => sent?.noteIds ?? []));

	// "Saturday", "Sat 29 Nov": the last day a link works.
	const until = (instant: string) =>
		formatDayLabel(todayISO(new Date(Date.parse(instant) - 1))).replace(
			/^(Today|Tomorrow)$/,
			(day) => day.toLowerCase()
		);

	const summary = (link: (typeof data.links)[number]) =>
		[
			link.noteCount ? `${link.noteCount} note${link.noteCount === 1 ? '' : 's'}` : '',
			link.showChores ? 'chores' : '',
			link.message ? 'a message' : ''
		]
			.filter(Boolean)
			.join(', ');
</script>

<svelte:head>
	<title>House-sitter link · home base</title>
</svelte:head>

<PageHeader title="House-sitter link">
	{#snippet lead()}
		<a class="button-quiet" href="/home"><Icon name="back" size={18} /> Home</a>
	{/snippet}
</PageHeader>

<p class="explain">
	Someone looking after the place gets one page with just what you pick. No account, nothing else of
	your home, and never money.
</p>

<div class="stack">
	<GlassCard>
		<form method="POST" action="?/create" class="form-stack" use:enhance={making.enhance}>
			<label class="field">
				<span class="field-label">Who it’s for</span>
				<input
					class="field-input"
					name="label"
					maxlength={SITTER_LABEL_MAX}
					placeholder="Sam, house-sitting"
					value={sent?.label ?? ''}
				/>
			</label>

			<label class="field">
				<span class="field-label">A message for them</span>
				<textarea
					class="field-input"
					name="message"
					rows="4"
					maxlength={SITTER_MESSAGE_MAX}
					placeholder="Feed Pickles twice a day. Spare key's under the pot."
					>{sent?.message ?? ''}</textarea
				>
			</label>

			{#if data.notes.length}
				<fieldset class="field">
					<legend class="field-label">Notes to show</legend>
					<ul class="grouped">
						{#each data.notes as note (note.id)}
							<li>
								<label class="grouped-row">
									<input
										type="checkbox"
										name="notes"
										value={note.id}
										checked={picked.has(note.id)}
									/>
									<span class="grouped-label">
										{note.title}
										{#if note.isSecret}<span class="grouped-sub"
												>Secret: shown once they tap it</span
											>{/if}
									</span>
								</label>
							</li>
						{/each}
					</ul>
				</fieldset>
			{/if}

			<label class="field check">
				<input type="checkbox" name="chores" checked={sent?.showChores ?? true} />
				<span>Show the chores due before it ends</span>
			</label>

			<label class="field">
				<span class="field-label">Last day</span>
				<input
					class="field-input"
					type="date"
					name="lastDay"
					min={data.today}
					max={addDays(data.today, SITTER_MAX_DAYS)}
					value={sent?.lastDay ?? data.suggestedLastDay}
				/>
				<span class="field-hint">It stops working at midnight, or whenever you stop it.</span>
			</label>

			{#if form?.create?.message}<p class="field-error" role="alert">{form.create.message}</p>{/if}

			<button class="button-primary" disabled={making.busy}>
				{making.busy ? 'Making a link…' : 'Make a sitter link'}
			</button>
		</form>
		{#if form?.create?.link}
			<ShareLink
				link={form.create.link}
				title="Looking after our place"
				label="House-sitter link"
			/>
		{/if}
	</GlassCard>

	{#if data.links.length}
		<section aria-labelledby="links-heading">
			<h2 id="links-heading" class="group-title">Links that still work</h2>
			<ul class="grouped">
				{#each data.links as link (link.id)}
					<li class="grouped-row">
						<span class="grouped-label">
							{link.label || 'House-sitter link'}
							<span class="grouped-sub"
								>Until the end of {until(link.expiresAt)}{summary(link)
									? ` · ${summary(link)}`
									: ''}</span
							>
						</span>
						<form method="POST" action="?/revoke" use:enhance={saveForm}>
							<input type="hidden" name="id" value={link.id} />
							<button class="button-quiet danger">Stop</button>
						</form>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	.explain {
		max-width: 38ch;
		margin-bottom: var(--space-l);
		color: var(--colour-text-muted);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-l);
	}

	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}

	.grouped-row input,
	.check input {
		width: 20px;
		height: 20px;
		flex: none;
		accent-color: var(--colour-accent);
	}

	.check {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 12px;
	}

	.danger {
		color: var(--colour-danger);
	}
</style>
