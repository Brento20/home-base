<script lang="ts">
	import { describePlanTime, planDay } from '#lib/features/plans/describe.js';
	import LinkedText from '#lib/features/plans/LinkedText.svelte';
	import { planMotif } from '#lib/features/plans/motif.js';
	import PlanMotif from '#lib/features/plans/PlanMotif.svelte';
	import { describeGuests } from '#lib/features/plans/plan-guests.js';
	import Avatar from '#lib/ui/Avatar.svelte';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import { enhance } from '$app/forms';
	import Icon from '#lib/ui/Icon.svelte';
	import { describeDaysAway, formatLongDate } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const plan = $derived(data.plan);
	const day = $derived(planDay(plan));
	const daysAway = $derived(describeDaysAway(day, data.today));
	const motif = $derived(planMotif(plan));
	const guests = $derived(data.guests);
	const summary = $derived(describeGuests(guests));
	// Grouped by home, the plan's own home first (the database orders them that way).
	const homes = $derived(
		guests.reduce<{ name: string; host: boolean; people: typeof guests }[]>((groups, guest) => {
			const group = groups.find((each) => each.name === guest.home);
			if (group) group.people.push(guest);
			else groups.push({ name: guest.home, host: guest.isHostHome, people: [guest] });
			return groups;
		}, [])
	);
	const hasGuests = $derived(Boolean(plan.invitedBy) || (plan.guestHomes?.length ?? 0) > 0);
	const status = (response: string | null) =>
		response === 'going' ? 'Going' : response === 'not_going' ? 'Not going' : 'Hasn’t replied';
	const mapsHref = $derived(
		plan.location ? `https://maps.apple.com/?q=${encodeURIComponent(plan.location)}` : null
	);
</script>

<svelte:head>
	<title>{plan.title} · home base</title>
</svelte:head>

<nav class="top-bar" aria-label="Plan">
	<a class="button-quiet back" href="/plans"><Icon name="back" size={18} /> Plans</a>
	{#if !plan.invitedBy}<a class="button-edit" href="/plans/{plan.id}/edit">Edit</a>{/if}
</nav>

<article class="summary">
	<header class="hero">
		<GlassSurface radius={28} />
		<div class="hero-body">
			{#if motif}<span class="motif"><PlanMotif {motif} /></span>{/if}
			{#if daysAway}<p class="days-away">{daysAway}</p>{/if}
			<h1>{plan.title}</h1>
			<p class="when">
				<span>{formatLongDate(day, data.today)}</span>
				<span class="time">{describePlanTime(plan)}</span>
			</p>
		</div>
	</header>

	{#if plan.invitedBy}
		<p class="invited-by">
			<strong>{plan.invitedBy.name}</strong> invited your home{plan.invitedBy.home
				? ` to ${plan.invitedBy.home}’s plan`
				: ''}.
		</p>
	{/if}

	{#if hasGuests}
		<section class="guests" aria-labelledby="guests-heading">
			<h2 id="guests-heading" class="detail-label caption-label">Who’s going</h2>
			{#each summary as line (line)}<p class="summary-line">{line}</p>{/each}

			<form class="answer" method="POST" action="?/respond" use:enhance>
				<span class="answer-label">Are you going?</span>
				<div class="answer-buttons">
					<button
						class="answer-button"
						class:chosen={plan.myResponse === 'going'}
						name="answer"
						value="going"
						aria-pressed={plan.myResponse === 'going'}>Going</button
					>
					<button
						class="answer-button"
						class:chosen={plan.myResponse === 'not_going'}
						name="answer"
						value="not_going"
						aria-pressed={plan.myResponse === 'not_going'}>Not going</button
					>
				</div>
			</form>

			{#each homes as home (home.name)}
				<div class="home-row">
					<h3 class="group-title home-title">
						{home.name}{home.host ? (plan.invitedBy ? ' · their plan' : ' · your plan') : ''}
					</h3>
					{#if !plan.invitedBy && !home.host}
						<form method="POST" action="?/uninvite" use:enhance>
							<input
								type="hidden"
								name="home"
								value={plan.guestHomes?.find((each) => each.name === home.name)?.id}
							/>
							<button class="button-quiet uninvite">Uninvite</button>
						</form>
					{/if}
				</div>
				<ul class="grouped">
					{#each home.people as person (person.id)}
						<li class="grouped-row guest">
							<a class="guest-link" href={person.isYou ? '/profile' : `/people/${person.id}`}>
								<Avatar
									person={{
										displayName: person.name,
										initials: person.initials,
										accentColour: person.colour,
										avatarUrl: person.avatarUrl
									}}
									size={30}
								/>
								<span class="grouped-label">
									{person.isYou ? `${person.name} (you)` : person.name}
									<span class="grouped-sub" class:going={person.response === 'going'}
										>{status(person.response)}</span
									>
								</span>
							</a>
							{#if person.canAdd}
								<form method="POST" action="?/addFriend" use:enhance>
									<input type="hidden" name="person" value={person.id} />
									<button class="button-quiet add">Add friend</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{/each}
			{#if guests.some((guest) => guest.canAdd)}
				<p class="group-note">You went together, so you can add each other without a link.</p>
			{/if}
			{#if form?.added}<p class="added" role="status">Added. You’re friends now.</p>{/if}
		</section>
	{/if}

	{#if data.invitable.length}
		<section class="detail" aria-labelledby="invite-heading">
			<h2 id="invite-heading" class="detail-label caption-label">Invite friends</h2>
			<p class="invite-note">Their whole home gets the invite, and each person answers.</p>
			<ul class="grouped">
				{#each data.invitable as friend (friend.id)}
					<li class="grouped-row">
						<span class="grouped-label"
							>{friend.name}<span class="grouped-sub">{friend.homeName}</span></span
						>
						<form method="POST" action="?/invite" use:enhance>
							<input type="hidden" name="friend" value={friend.id} />
							<button class="button-quiet add">Invite</button>
						</form>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
	{#if form?.message}<p class="field-error" role="alert">{form.message}</p>{/if}

	{#if plan.location}
		<section class="detail" aria-labelledby="where-heading">
			<h2 id="where-heading" class="detail-label caption-label">Where</h2>
			<p class="detail-text">{plan.location}</p>
			{#if mapsHref}
				<a class="button-quiet maps" href={mapsHref} target="_blank" rel="noopener noreferrer"
					>Open in Maps</a
				>
			{/if}
		</section>
	{/if}

	{#if plan.notes}
		<section class="detail" aria-labelledby="notes-heading">
			<h2 id="notes-heading" class="detail-label caption-label">Notes</h2>
			<p class="detail-text notes"><LinkedText text={plan.notes} /></p>
		</section>
	{/if}

	{#if plan.postId && !plan.invitedBy}
		<a class="from-post" href="/feed/{plan.postId}">
			<Icon name="compose" size={20} />
			<span class="from-post-text">
				<span class="from-post-title">From the home feed</span>
				<span class="from-post-sub">See the conversation</span>
			</span>
			<Icon name="chevron" size={16} />
		</a>
	{/if}
</article>

<style>
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: -10px -4px var(--space-l) -4px;
	}

	.from-post {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 60px;
		padding: 10px 14px;
		border-radius: 18px;
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
		color: inherit;
		text-decoration: none;
	}

	.from-post:active {
		background: var(--colour-press);
	}

	.from-post > :global(svg:first-child) {
		color: var(--colour-accent);
	}

	.from-post > :global(svg:last-child) {
		color: var(--colour-text-faint);
	}

	.from-post-text {
		display: flex;
		flex: 1;
		flex-direction: column;
		line-height: 1.3;
	}

	.from-post-title {
		font-weight: var(--weight-medium);
	}

	.from-post-sub {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.summary {
		display: flex;
		flex-direction: column;
		gap: var(--space-l);
	}

	.hero {
		position: relative;
		border-radius: var(--radius-card);
	}

	.hero-body {
		position: relative;
		z-index: 1;
		padding: 24px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 var(--hairline) var(--colour-separator),
			var(--glass-highlight);
	}

	/* The plan's drawing, etched into the glass in the corner, clear of the edges. */
	.motif {
		position: absolute;
		right: 22px;
		bottom: 22px;
		z-index: -1;
		width: 104px;
		pointer-events: none;
	}

	.days-away {
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		letter-spacing: var(--tracking-label);
		color: var(--colour-accent);
	}

	h1 {
		margin-top: 8px;
		font-size: var(--text-event-title);
		line-height: 1.08;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		overflow-wrap: anywhere;
	}

	.when {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-top: 14px;
		font-size: var(--text-body);
	}

	.when .time {
		color: var(--colour-text-muted);
	}

	.invited-by {
		margin-top: var(--space-m);
		color: var(--colour-text-muted);
	}

	.invited-by strong {
		color: var(--colour-text);
		font-weight: var(--weight-medium);
	}

	.guests {
		margin-top: var(--space-l);
	}

	.summary-line {
		line-height: 1.45;
	}

	.answer {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: var(--space-m) 0;
	}

	.answer-label {
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.answer-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.answer-button {
		min-height: var(--tap-target);
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--colour-fill);
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
		color: var(--colour-text);
		font: inherit;
		font-weight: var(--weight-medium);
		transition: background-color var(--duration-quick) var(--ease-out);
	}

	.answer-button.chosen {
		background: var(--colour-accent);
		color: var(--colour-on-accent);
		box-shadow: none;
	}

	.home-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-top: var(--space-m);
	}

	.home-title {
		margin-bottom: 8px;
	}

	.guest {
		gap: 12px;
	}

	.guest-link {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 12px;
		min-width: 0;
		color: inherit;
		text-decoration: none;
	}

	.going {
		color: var(--colour-accent);
	}

	.add,
	.uninvite {
		flex: none;
	}

	.uninvite {
		color: var(--colour-text-faint);
		font-size: var(--text-caption);
	}

	.added {
		margin-top: var(--space-s);
		color: var(--colour-accent);
	}

	.invite-note {
		margin-bottom: var(--space-s);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.detail {
		padding: 0 4px;
	}

	.detail-label {
		margin-bottom: 6px;
	}

	.detail-text {
		font-size: var(--text-body);
		overflow-wrap: anywhere;
	}

	.notes {
		white-space: pre-line;
	}

	.maps {
		margin-left: -4px;
		color: var(--colour-accent);
	}
</style>
