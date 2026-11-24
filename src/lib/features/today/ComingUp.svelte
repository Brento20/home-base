<script lang="ts">
	import { arrive, changed, glide, leave } from '#lib/ui/motion.js';
	import { pick } from '#lib/copy/pick.js';
	import { EMPTY } from '#lib/copy/voice.js';
	/**
	 * Today's swipeable row of plans and chores. Cards snap into place and a warm glow follows
	 * the card you've swiped to. The last card links to all plans and tasks.
	 */
	import { onMount, tick } from 'svelte';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { Profile } from '#lib/types.js';
	import type { ComingUpItem } from './coming-up.js';
	import ComingUpList from './ComingUpList.svelte';
	import PlanHeroCard from './PlanHeroCard.svelte';
	import TaskCard from './TaskCard.svelte';

	interface Props {
		items: ComingUpItem[];
		people: Profile[];
		today: string;
		/**
		 * Display preferences: how many show before "Show N more" (null for all), and the big
		 * swipeable cards or a compact list. The order and the actions never change.
		 */
		limit?: number | null;
		layout?: 'cards' | 'list';
	}

	let { items, people, today, limit = null, layout = 'cards' }: Props = $props();
	/** "Show N more" tapped: everything, until you leave Today. */
	let expanded = $state(false);

	// Said a little differently each visit (src/lib/copy/voice.ts).
	const emptyTitle = pick(EMPTY.comingUpTitle);
	const emptyAction = pick(EMPTY.comingUpAction);

	let track = $state<HTMLElement>();
	let active = $state(0);
	let now = $state<Date | null>(null);
	// Chores ticked off here leave straight away, before the refreshed data arrives.
	let ticked = $state<string[]>([]);

	const visible = $derived(
		items.filter((item) => !(item.kind === 'task' && ticked.includes(item.task.id)))
	);
	// The first few (display preferences), the rest a tap away; nothing is dropped or reordered.
	const shown = $derived(limit && !expanded ? visible.slice(0, limit) : visible);
	const more = $derived(visible.length - shown.length);
	// The next plan gets the countdown and the larger title.
	const nextPlanId = $derived(visible.find((item) => item.kind === 'plan')?.id);
	// One dot per card, plus the closing "All plans / All tasks" card.
	const pageCount = $derived(shown.length + 1);

	async function showMore() {
		const first = shown.length;
		expanded = true;
		await tick();
		// Straight to the first card that was hidden.
		if (layout === 'cards') goTo(first);
		updateActive();
		moveIndicator();
	}

	function updateActive() {
		if (!track) return;
		const cards = [...track.children] as HTMLElement[];
		const left = track.scrollLeft + track.clientWidth * 0.3;
		let index = 0;
		cards.forEach((card, i) => {
			if (card.offsetLeft - track!.offsetLeft <= left) index = i;
		});
		// The last card is narrow and can't snap to the start, so the end of the row counts as it.
		if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 4) index = cards.length - 1;
		active = index;
	}

	let frame = 0;
	function onScroll() {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			updateActive();
			moveIndicator();
		});
	}

	/*
	 * The indicator under the row: a slim track with a bar that follows the scroll position
	 * itself, every frame, rather than jumping when a card settles. It's written straight to the
	 * element's transform (no Svelte state), so following a swipe costs a single composited move.
	 */
	let thumb = $state<HTMLElement>();
	function moveIndicator() {
		if (!track || !thumb) return;
		const range = track.scrollWidth - track.clientWidth;
		const progress = range > 0 ? Math.min(1, Math.max(0, track.scrollLeft / range)) : 0;
		thumb.style.setProperty('--progress', String(progress));
	}

	// Tapping the track jumps to the card under that point.
	function jump(event: MouseEvent) {
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const ratio = (event.clientX - box.left) / box.width;
		goTo(Math.round(Math.min(1, Math.max(0, ratio)) * (pageCount - 1)));
	}

	function goTo(index: number) {
		const card = track?.children[index] as HTMLElement | undefined;
		card?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
	}

	async function onTaskDone(id: string) {
		ticked = [...ticked, id];
		await tick();
		updateActive();
		moveIndicator();
	}

	// Once fresh data no longer includes a ticked chore, forget it.
	$effect(() => {
		const ids = new Set(items.flatMap((item) => (item.kind === 'task' ? [item.task.id] : [])));
		if (ticked.some((id) => !ids.has(id))) ticked = ticked.filter((id) => ids.has(id));
	});

	const labelFor = (item: ComingUpItem, index: number) => {
		const position = `${index + 1} of ${shown.length}`;
		return item.kind === 'plan'
			? `${position}, plan: ${item.plan.title}`
			: `${position}, ${item.task.recipe ? 'dinner' : 'chore'}: ${item.task.title}`;
	};

	// Countdown is client-only so the server render never disagrees with the phone's clock.
	onMount(() => {
		now = new Date();
		const timer = setInterval(() => (now = new Date()), 60_000);
		return () => {
			clearInterval(timer);
			cancelAnimationFrame(frame);
		};
	});

	/** What a card shows: when it changes after the card first appears, the card pops. */
	function signature(item: (typeof items)[number]) {
		return item.kind === 'plan'
			? `${item.plan.title}|${item.plan.startsAt}|${item.plan.location}`
			: `${item.task.title}|${item.task.assigneeId}|${item.task.dueOn}|${item.task.dueTime}`;
	}
</script>

{#if visible.length === 0}
	<a class="empty" href="/plans/new">
		<span class="empty-title">{emptyTitle}</span>
		<span class="empty-action">{emptyAction}</span>
	</a>
{:else if layout === 'list'}
	<section class="coming-list-wrap" aria-label="Coming up">
		<ComingUpList items={shown} {people} {today} ondone={onTaskDone} />
		<div class="list-more">
			{#if more}
				<button type="button" class="button-quiet" onclick={showMore}>Show {more} more</button>
			{/if}
			<a class="button-quiet" href="/plans">All plans</a>
			<a class="button-quiet" href="/lists/tasks">All tasks</a>
		</div>
	</section>
{:else}
	<section class="coming-up" aria-label="Coming up">
		<ol class="track" bind:this={track} onscroll={onScroll}>
			{#each shown as item, index (item.id)}
				<li
					class="slide"
					class:active={index === active}
					in:arrive={{ x: 28, y: 0 }}
					out:leave
					animate:glide
					use:changed={signature(item)}
				>
					<span class="slide-glow" aria-hidden="true"></span>
					{#if item.kind === 'plan'}
						<PlanHeroCard
							plan={item.plan}
							{today}
							next={item.id === nextPlanId}
							highlighted={index === active}
							{now}
							label={labelFor(item, index)}
						/>
					{:else}
						<TaskCard
							task={item.task}
							{people}
							{today}
							highlighted={index === active}
							label={labelFor(item, index)}
							ondone={onTaskDone}
						/>
					{/if}
				</li>
			{/each}
			<li class="slide slide-more" class:active={active === shown.length}>
				<span class="slide-glow" aria-hidden="true"></span>
				<div class="more">
					<GlassSurface radius={28} squish />
					<span class="more-body">
						{#if more}
							<button type="button" class="show-more" onclick={showMore}>Show {more} more</button>
						{/if}
						<a href="/plans">All plans <Icon name="chevron" size={18} /></a>
						<a href="/lists/tasks">All tasks <Icon name="chevron" size={18} /></a>
					</span>
				</div>
			</li>
		</ol>

		{#if pageCount > 1}
			<!-- Swiping is the main way; the track still takes a forgiving tap. -->
			<button
				type="button"
				class="indicator"
				tabindex="-1"
				aria-hidden="true"
				style:--pages={pageCount}
				onclick={jump}
			>
				<span class="indicator-track"><span class="indicator-thumb" bind:this={thumb}></span></span>
			</button>
		{/if}
	</section>
{/if}

<style>
	.coming-up {
		/*
		 * Bleed past the screen edges so the next card peeks in from the right. On a phone the
		 * row runs an extra 64px off each side, so when a swipe pulls the page sideways the
		 * scroller's edge stays off screen and the next card slides in whole, rather than
		 * showing a hard cut. (The app clips sideways overflow at the screen edge.)
		 */
		--bleed: calc(var(--page-gutter) + 64px);
		margin-inline: calc(-1 * var(--bleed));
	}

	@media (min-width: 520px) {
		.coming-up {
			--bleed: var(--page-gutter);
		}
	}

	.track {
		display: flex;
		gap: 12px;
		/*
		 * A scroller clips everything outside its padding box, so the padding has to hold
		 * the whole glow (about 70px below the card). Negative margins give that space back
		 * to the page; what follows in the page sits on top of the empty padding, so taps
		 * there still reach the to-do list.
		 */
		margin: -24px 0 -66px;
		padding: 24px var(--bleed) 80px;
		list-style: none;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x mandatory;
		scroll-padding-inline: var(--bleed);
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
	}

	.track::-webkit-scrollbar {
		display: none;
	}

	/* Wider than a phone, the row ends inside the page, so fade it out rather than cut it. */
	@media (min-width: 520px) {
		.track {
			-webkit-mask-image: linear-gradient(
				to right,
				transparent,
				#000 var(--page-gutter),
				#000 calc(100% - var(--page-gutter)),
				transparent
			);
			mask-image: linear-gradient(
				to right,
				transparent,
				#000 var(--page-gutter),
				#000 calc(100% - var(--page-gutter)),
				transparent
			);
		}
	}

	.slide {
		/*
		 * 82% of the screen width on a phone. On wider screens the row is only as wide as the
		 * page column, so the second value keeps a sliver of the next card peeking in.
		 */
		--slide-width: min(82vw, 100% - 7vw);
		flex: 0 0 var(--slide-width);
		/* Never wider than that, however long a title or location runs. */
		min-width: 0;
		max-width: var(--slide-width);
		min-height: 148px;
		pointer-events: auto;
		scroll-snap-align: start;
		/* One card per swipe, however hard you flick. */
		scroll-snap-stop: always;
		transition: opacity var(--duration-settle) var(--ease-out);
	}

	/*
	 * The warm glow travels with the card you've swiped to: every card has one, and only
	 * the active card's is faded in, so it hands over smoothly mid-swipe.
	 */
	.slide {
		position: relative;
	}

	.slide-glow {
		position: absolute;
		inset: 0;
		border-radius: var(--radius-card);
		box-shadow: var(--glow-event);
		opacity: 0;
		transition: opacity 450ms var(--ease-out);
		pointer-events: none;
	}

	.slide.active .slide-glow {
		opacity: 1;
	}

	/* The "All plans" card gets a softer glow. */
	.slide-more.active .slide-glow {
		opacity: 0.6;
	}

	/* The card that has settled is at full strength; the ones either side sit back a little. */
	.slide:not(.active) {
		opacity: 0.72;
	}

	.slide-more {
		--slide-width: min(34vw, 40%);
		scroll-snap-align: end;
	}

	.more {
		position: relative;
		height: 100%;
		border-radius: var(--radius-card);
		-webkit-touch-callout: none;
	}

	.more-body {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 4px;
		height: 100%;
		padding: 0 6px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
	}

	.more-body a {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-height: var(--tap-target);
		border-radius: 14px;
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
		color: var(--colour-text-muted);
		text-decoration: none;
	}

	.more-body a:global([data-pressed]) {
		background: var(--colour-fill);
	}

	/* The hidden cards (display preferences): the first thing on the closing card. */
	.show-more {
		min-height: var(--tap-target);
		border: 0;
		border-radius: 14px;
		background: var(--colour-accent-soft);
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
		color: var(--colour-accent);
	}

	/* Under the compact list: Show N more, then the full lists. */
	.list-more {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 6px;
	}

	.list-more .button-quiet {
		min-height: var(--tap-target);
		font-size: var(--text-small);
		color: var(--colour-accent);
	}

	/*
	 * A slim track with a bar that slides along it as the row scrolls, like the scroll position
	 * in a page view on iOS, but continuous: it moves with your finger, not after the snap. The
	 * bar is one page's share of the track (never shorter than 14px).
	 */
	.indicator {
		position: relative;
		display: flex;
		justify-content: center;
		width: 100%;
		margin-top: 2px;
		padding: 10px 0;
		border: 0;
		background: none;
	}

	.indicator-track {
		--track: min(72px, calc(var(--pages) * 14px));
		--bar: max(14px, calc(var(--track) / var(--pages)));
		position: relative;
		width: var(--track);
		height: 4px;
		overflow: hidden;
		border-radius: 2px;
		background: var(--colour-fill-stronger);
	}

	.indicator-thumb {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--bar);
		height: 100%;
		border-radius: inherit;
		background: var(--colour-accent);
		transform: translateX(calc(var(--progress, 0) * (var(--track) - var(--bar))));
		will-change: transform;
	}

	.empty {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 22px 24px 24px;
		border-radius: var(--radius-card);
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
		text-decoration: none;
		color: inherit;
	}

	.empty-title {
		font-size: 1.375rem;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		color: var(--colour-text-muted);
	}

	.empty-action {
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}
</style>
