<script lang="ts">
	/**
	 * Manage friends: the things you rarely need, off the main page. Requests you've sent and
	 * friend links nobody's opened yet (both can be cancelled), and people you've blocked.
	 */
	import { enhance } from '$app/forms';
	import { saveForm } from '#lib/ui/save.svelte.js';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import { formatDayLabel, todayISO } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// "Expires Saturday", "Expires Sat 29 Nov".
	const expires = (instant: string) => {
		const label = formatDayLabel(todayISO(new Date(instant)));
		return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : label;
	};
	const nothing = $derived(!data.sent.length && !data.links.length && !data.blocked.length);
</script>

<svelte:head>
	<title>Manage friends · home base</title>
</svelte:head>

<PageHeader title="Manage friends">
	{#snippet lead()}
		<a class="button-quiet" href="/profile"><Icon name="back" size={18} /> You &amp; friends</a>
	{/snippet}
</PageHeader>

{#if form?.message}<p class="field-error" role="alert">{form.message}</p>{/if}

{#if nothing}
	<p class="empty">
		Nothing waiting. Requests you send and friend links you make show here until they’re answered,
		along with anyone you block.
	</p>
{/if}

<div class="stack">
	{#if data.sent.length}
		<section aria-labelledby="sent-heading">
			<h2 id="sent-heading" class="group-title">Requests you’ve sent</h2>
			<ul class="grouped">
				{#each data.sent as request (request.id)}
					<li class="grouped-row">
						<span class="grouped-label">
							{request.name}
							<span class="grouped-sub">Waiting for them to answer</span>
						</span>
						<form method="POST" action="?/cancel" use:enhance={saveForm}>
							<input type="hidden" name="person" value={request.id} />
							<button class="button-quiet danger">Cancel</button>
						</form>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

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
						<form method="POST" action="?/revoke" use:enhance={saveForm}>
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
						<form method="POST" action="?/unblock" use:enhance={saveForm}>
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

	.empty {
		color: var(--colour-text-muted);
	}
</style>
