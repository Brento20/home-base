<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import { enhance } from '$app/forms';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.importCalendar);
	let importing = $state(false);

	const months = $derived(Math.round(data.recurringWindowDays / 30));
</script>

<svelte:head>
	<title>Import calendar · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/plans"><Icon name="back" size={18} /> Plans</a>
	{/snippet}
</PageHeader>

{#if form && 'imported' in form && form.imported}
	{@const result = form.imported}
	<div class="result" role="status">
		<p class="headline">
			{result.added === 0
				? 'Nothing new to add'
				: `Added ${result.added} ${result.added === 1 ? 'plan' : 'plans'}`}
		</p>
		<p class="muted">
			{#if result.calendarName}From “{result.calendarName}”.
			{/if}
			{#if result.alreadyHere > 0}{result.alreadyHere}
				{result.alreadyHere === 1 ? 'was' : 'were'} already here.{/if}
		</p>
		<a class="button-primary" href="/plans">See plans</a>
	</div>
{:else}
	<div class="intro">
		<p>
			Copy upcoming events from an Apple Calendar export into Plans. It’s a one-time copy: later
			changes in Calendar won’t show up here, but importing the same file again won’t add
			duplicates.
		</p>
		<p class="muted">
			Repeating events are copied for the next {months} months. In Calendar on your Mac, choose File ›
			Export › Export… to save the .ics file.
		</p>
	</div>

	<form
		method="POST"
		enctype="multipart/form-data"
		class="form-stack"
		use:enhance={() => {
			importing = true;
			return async ({ update }) => {
				await update();
				importing = false;
			};
		}}
	>
		<label class="field">
			<span class="field-label">Calendar file</span>
			<input
				class="field-input file"
				type="file"
				name="calendar"
				accept=".ics,text/calendar"
				required
			/>
		</label>
		{#if form && 'message' in form}<p class="field-error" role="alert">{form.message}</p>{/if}
		<div class="form-actions">
			<button class="button-primary" disabled={importing}
				>{importing ? 'Importing…' : 'Import'}</button
			>
		</div>
	</form>
{/if}

<style>
	.intro {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
		margin-bottom: var(--space-l);
		max-width: 38ch;
	}

	.muted {
		color: var(--colour-text-muted);
		font-size: var(--text-small);
	}

	.file {
		padding: 12px;
		font-size: var(--text-small);
	}

	.result {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-m);
	}

	.headline {
		font-size: 1.375rem;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
	}
</style>
