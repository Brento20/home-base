<script lang="ts">
	import { untrack } from 'svelte';
	import { pick } from '#lib/copy/pick.js';
	import { EMPTY } from '#lib/copy/voice.js';
	import { groupPlansByDay } from '#lib/features/plans/describe.js';
	import PlanCalendar from '#lib/features/plans/PlanCalendar.svelte';
	import PlanRow from '#lib/features/plans/PlanRow.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import RoundButton from '#lib/ui/RoundButton.svelte';
	import SegmentedNav from '#lib/ui/SegmentedNav.svelte';
	import { kept } from '#lib/ui/kept.svelte.js';
	import { arrive, glide, leave } from '#lib/ui/motion.js';
	import Reveal from '#lib/ui/Reveal.svelte';
	import type { Plan } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Said a little differently each visit (src/lib/copy/voice.ts).
	const emptyLine = pick(EMPTY.plans);

	// Each view is the copy this phone kept from last time until fresh data lands, then updates
	// in place (src/lib/ui/kept.svelte.ts): the list, and each month of the calendar.
	const list = kept(
		() => (data.view === 'list' ? 'plans' : ''),
		() => (data.view === 'list' ? data.list : null)
	);
	const month = kept(
		() => (data.view === 'calendar' ? `plans-${data.month}` : ''),
		() => (data.view === 'calendar' ? data.entries : null)
	);
	const firstPage = $derived(list.current?.plans ?? []);

	// The list shows the first page of plans; "Show later plans" adds more from /plans/later.
	// When the page's plans refresh, the later ones already showing refresh too, in one request.
	let later = $state<Plan[]>([]);
	let laterHasMore = $state<boolean | null>(null);
	let loadingLater = $state(false);
	let laterFailed = $state(false);
	const listed = $derived.by(() => {
		if (data.view !== 'list') return [];
		const ids = new Set(firstPage.map((plan) => plan.id));
		return [...firstPage, ...later.filter((plan) => !ids.has(plan.id))];
	});
	const moreLater = $derived(
		data.view === 'list' && (laterHasMore ?? list.current?.hasMore ?? false)
	);

	async function fetchLater(offset: number, limit: number) {
		const response = await fetch(`/plans/later?offset=${offset}&limit=${limit}`, {
			headers: { accept: 'application/json' }
		});
		if (!response.ok) throw new Error(String(response.status));
		return (await response.json()) as { plans: Plan[]; hasMore: boolean };
	}

	async function showLater() {
		if (data.view !== 'list' || !list.current || loadingLater) return;
		loadingLater = true;
		laterFailed = false;
		try {
			const page = await fetchLater(
				firstPage.length + later.length,
				Math.max(firstPage.length, 12)
			);
			later = [...later, ...page.plans];
			laterHasMore = page.hasMore;
		} catch {
			laterFailed = true;
		} finally {
			loadingLater = false;
		}
	}

	$effect(() => {
		if (data.view !== 'list' || !list.current) return;
		const first = firstPage.length;
		const count = untrack(() => later.length);
		if (count === 0) return;
		let current = true;
		fetchLater(first, count)
			.then((page) => {
				if (!current) return;
				later = page.plans;
				laterHasMore = page.hasMore;
			})
			.catch(() => {});
		return () => (current = false);
	});

	const groups = $derived(data.view === 'list' ? groupPlansByDay(listed, data.today) : []);

	// Later plans load by themselves as the end of the list comes near (the button stays for
	// when that can't happen, or a load failed).
	let end = $state<HTMLElement>();
	$effect(() => {
		if (!end || !moreLater || laterFailed || !('IntersectionObserver' in window)) return;
		const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && showLater(), {
			rootMargin: '600px 0px'
		});
		observer.observe(end);
		return () => observer.disconnect();
	});

	const isOver = (plan: Plan) =>
		!plan.allDay && new Date(plan.endsAt ?? plan.startsAt).getTime() < new Date(data.now).getTime();
</script>

<svelte:head>
	<title>Plans · home base</title>
</svelte:head>

<PageHeader title="Plans">
	{#snippet action()}
		<RoundButton icon="plus" label="New plan" href="/plans/new" />
	{/snippet}
</PageHeader>

<div class="views">
	<SegmentedNav
		label="Show plans as"
		active={data.view === 'calendar' ? 1 : 0}
		items={[
			{ href: '/plans?view=list', label: 'List' },
			{ href: '/plans?view=calendar', label: 'Calendar' }
		]}
	/>
</div>

{#if data.view === 'calendar'}
	<PlanCalendar
		month={data.month}
		plans={month.current?.plans ?? []}
		dinners={month.current?.dinners ?? []}
		loading={!month.current && month.waiting}
		failed={!month.current && month.failed}
		people={data.household.members}
		today={data.today}
		now={data.now}
	/>
	<p class="footer"><a class="button-quiet" href="/plans/import">Import from Apple Calendar</a></p>
{:else}
	<Reveal of={list} placeholder={[92, 92, 92, 92]} radius={22} label="Loading plans">
		{#if groups.length === 0}
			<div class="empty">
				<p>{emptyLine}</p>
				<a class="button-quiet" href="/plans/import">Import from Apple Calendar</a>
			</div>
		{:else}
			{#each groups as group (group.day)}
				<section class="day" aria-labelledby="day-{group.day}" in:arrive out:leave animate:glide>
					<h2 id="day-{group.day}" class="day-label caption-label">{group.label}</h2>
					<ul>
						{#each group.plans as plan (plan.id)}
							<PlanRow {plan} past={isOver(plan)} />
						{/each}
					</ul>
				</section>
			{/each}
			{#if moreLater}
				<div class="later" bind:this={end}>
					<button
						type="button"
						class="button-secondary"
						onclick={showLater}
						disabled={loadingLater}
					>
						{loadingLater
							? 'Loading later plans…'
							: laterFailed
								? 'Couldn’t load. Try again'
								: 'Show later plans'}
					</button>
				</div>
			{/if}
			<p class="footer">
				<a class="button-quiet" href="/plans/import">Import from Apple Calendar</a>
			</p>
		{/if}
	</Reveal>
{/if}

<style>
	.later {
		display: flex;
		justify-content: center;
		margin-top: var(--space-l);
	}

	.views {
		margin-bottom: var(--space-l);
	}

	/*
	 * Day groups off screen aren't styled, laid out or painted until you scroll near them, so a
	 * long list costs the same to open (and to slide in and out of) as a short one. The size is
	 * a placeholder until a group has been drawn once; then its real height is remembered.
	 */
	.day {
		content-visibility: auto;
		contain-intrinsic-size: auto 180px;
	}

	.day + .day {
		margin-top: 28px;
	}

	.day-label {
		margin: 0 0 10px 4px;
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
		padding: 0;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-s);
		color: var(--colour-text-muted);
	}

	.footer {
		margin-top: var(--space-xl);
	}
</style>
