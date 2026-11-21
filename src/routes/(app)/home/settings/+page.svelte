<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import { enhance } from '$app/forms';
	import Avatar from '#lib/ui/Avatar.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import ShareLink from '#lib/ui/ShareLink.svelte';
	import { placesLeft } from '#lib/features/homes/invites.js';
	import { formatDayLabel, todayISO } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.homeSettings);
	let busy = $state<'rename' | 'invite' | 'place' | null>(null);

	// Time zones grouped by region for the picker: "Australia" › "Sydney".
	const zoneGroups = $derived.by(() => {
		const groups: Record<string, { value: string; label: string }[]> = {};
		for (const zone of data.timeZones) {
			const [region, ...rest] = zone.split('/');
			const label = rest.length ? rest.join(' / ').replaceAll('_', ' ') : region;
			(groups[region] ??= []).push({ value: zone, label });
		}
		return Object.entries(groups);
	});
	const zoneName = (zone: string) => zone.split('/').pop()!.replaceAll('_', ' ');
	const currencyName = (code: string) =>
		data.currencies.find((currency) => currency.code === code)?.name ?? code;

	const alone = $derived(data.household.members.length === 1);

	const submitting = (which: 'rename' | 'invite') => () => {
		busy = which;
		return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			busy = null;
		};
	};

	// "Expires tomorrow", "Expires Saturday", "Expires Sat 29 Nov".
	const expires = (instant: string) => {
		const label = formatDayLabel(todayISO(new Date(instant)));
		return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : label;
	};
</script>

<svelte:head>
	<title>Home settings · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/home"><Icon name="back" size={18} /> Home</a>
	{/snippet}
</PageHeader>

<section aria-labelledby="people-heading">
	<h2 id="people-heading" class="section-label caption-label">Everyone here</h2>
	<ul class="people">
		{#each data.household.members as person (person.id)}
			<li>
				<Avatar {person} size={36} />
				<span class="name">{person.displayName}{person.id === data.me.id ? ' (you)' : ''}</span>
				{#if data.household.ownerIds.includes(person.id)}<span class="role">Owner</span>{/if}
			</li>
		{/each}
	</ul>
</section>

<section aria-labelledby="place-heading">
	<h2 id="place-heading" class="section-label caption-label">Where home is</h2>
	{#if data.isOwner}
		<GlassCard>
			<form
				method="POST"
				action="?/place"
				class="form-stack"
				use:enhance={() => {
					busy = 'place';
					return async ({ result, update }) => {
						// Every date and amount on screen was drawn the old way: start fresh.
						if (result.type === 'success') location.reload();
						else {
							await update({ reset: false });
							busy = null;
						}
					};
				}}
			>
				<label class="field">
					<span class="field-label">Time zone</span>
					<select class="field-input" name="timeZone" value={data.home.timeZone}>
						{#each zoneGroups as [region, zones] (region)}
							<optgroup label={region.replaceAll('_', ' ')}>
								{#each zones as zone (zone.value)}
									<option value={zone.value}>{zone.label}</option>
								{/each}
							</optgroup>
						{/each}
					</select>
					<span class="field-hint"
						>Sets what “today” means for due dates, points and the colours.</span
					>
				</label>
				<label class="field">
					<span class="field-label">Money</span>
					<select class="field-input" name="currency" value={data.home.currency}>
						{#each data.currencies as currency (currency.code)}
							<option value={currency.code}>{currency.name} ({currency.code})</option>
						{/each}
					</select>
					<span class="field-hint"
						>Amounts already saved keep their numbers; only the sign changes.</span
					>
				</label>
				{#if form?.place?.message}<p class="field-error" role="alert">{form.place.message}</p>{/if}
				<button class="button-secondary" disabled={busy === 'place'}>
					{busy === 'place' ? 'Saving…' : 'Save'}
				</button>
			</form>
		</GlassCard>
	{:else}
		<p class="explain">
			{zoneName(data.home.timeZone)} time, in {currencyName(data.home.currency)}s ({data.home
				.currency}). An owner can change this.
		</p>
	{/if}
</section>

{#if data.isOwner}
	<section aria-labelledby="invite-heading">
		<h2 id="invite-heading" class="section-label caption-label">Inviting people</h2>
		<p class="explain">
			Send someone a link. It lasts a week and only lets in the people it was made for.
		</p>

		<div class="stack">
			<GlassCard>
				<form method="POST" action="?/invite" class="form-stack" use:enhance={submitting('invite')}>
					<label class="field">
						<span class="field-label">Who it’s for</span>
						<select class="field-input" name="uses">
							<option value="1">One person</option>
							<option value="5">Up to 5 people</option>
						</select>
					</label>
					{#if form?.invite?.message}<p class="field-error" role="alert">
							{form.invite.message}
						</p>{/if}
					<button class="button-primary" disabled={busy === 'invite'}>
						{busy === 'invite' ? 'Making a link…' : 'Create invite link'}
					</button>
				</form>

				{#if form?.invite?.link}
					<ShareLink
						link={form.invite.link}
						title="Join {data.household.name} on home base"
						label="Invite link"
					/>
				{/if}
			</GlassCard>

			{#if data.invites.length}
				<div>
					<h3 class="group-title">Links that still work</h3>
					<ul class="grouped">
						{#each data.invites as invite (invite.id)}
							<li class="grouped-row invite">
								<span class="grouped-label">
									{placesLeft(invite.uses, invite.maxUses)}
									<span class="invite-detail">Expires {expires(invite.expiresAt)}</span>
								</span>
								<form method="POST" action="?/revoke" use:enhance>
									<input type="hidden" name="id" value={invite.id} />
									<button class="button-quiet danger">Revoke</button>
								</form>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<GlassCard>
				<form method="POST" action="?/rename" class="form-stack" use:enhance={submitting('rename')}>
					<label class="field">
						<span class="field-label">Home name</span>
						<input
							class="field-input"
							name="name"
							value={form?.rename?.name ?? data.household.name}
							minlength="3"
							maxlength="30"
							required
							aria-invalid={form?.rename?.message ? 'true' : undefined}
						/>
						{#if form?.rename?.message}<span class="field-error">{form.rename.message}</span>
						{:else if form?.rename && 'saved' in form.rename}<span class="field-hint">Saved.</span
							>{:else}<span class="field-hint">Shown on invite links.</span>{/if}
					</label>
					<button class="button-secondary" disabled={busy === 'rename'}>
						{busy === 'rename' ? 'Saving…' : 'Rename home'}
					</button>
				</form>
			</GlassCard>
		</div>
	</section>
{:else}
	<p class="explain">To invite someone, ask an owner to send them an invite link.</p>
{/if}

<section class="leave" aria-labelledby="leave-heading">
	<h2 id="leave-heading" class="section-label caption-label">Leaving</h2>
	<p class="explain">
		{#if alone}
			You’re the only one here, so leaving deletes {data.household.name} and everything in it, for good.
		{:else}
			You’ll lose access to everything here. Come back any time with a new invite link.
			{#if data.isOwner && data.household.ownerIds.length === 1}Whoever’s been here longest becomes
				the owner.{/if}
		{/if}
	</p>
	{#if form?.leave?.message}<p class="field-error" role="alert">{form.leave.message}</p>{/if}
	<ConfirmDelete
		action="?/leave"
		label={alone ? `Leave and delete ${data.household.name}` : `Leave ${data.household.name}`}
		confirmLabel={alone ? 'Tap again to delete it all' : 'Tap again to leave'}
	/>
</section>

<style>
	section + section,
	section + .explain,
	.explain + .leave {
		margin-top: var(--space-xl);
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

	.name {
		flex: 1;
	}

	.role {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.explain {
		max-width: 36ch;
		margin-bottom: var(--space-m);
		color: var(--colour-text-muted);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.invite .grouped-label {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.invite-detail {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.danger {
		color: var(--colour-danger);
	}
</style>
