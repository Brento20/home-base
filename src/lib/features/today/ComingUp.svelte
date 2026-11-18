<script lang="ts">
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
	import PlanHeroCard from './PlanHeroCard.svelte';
	import TaskCard from './TaskCard.svelte';

	interface Props {
		items: ComingUpItem[];
		people: Profile[];
		today: string;
	}

	let { items, people, today }: Props = $props();

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
	// The next plan gets the countdown and the larger title.
	const nextPlanId = $derived(visible.find((item) => item.kind === 'plan')?.id);
	// One dot per card, plus the closing "All plans / All tasks" card.
	const pageCount = $derived(visible.length + 1);

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
		frame = requestAnimationFrame(updateActive);
	}

	function goTo(index: number) {
		const card = track?.children[index] as HTMLElement | undefined;
		card?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
	}

	async function onTaskDone(id: string) {
		ticked = [...ticked, id];
		await tick();
		updateActive();
	}

	// Once fresh data no longer includes a ticked chore, forget it.
	$effect(() => {
		const ids = new Set(items.flatMap((item) => (item.kind === 'task' ? [item.task.id] : [])));
		if (ticked.some((id) => !ids.has(id))) ticked = ticked.filter((id) => ids.has(id));
	});

	const labelFor = (item: ComingUpItem, index: number) => {
		const position = `${index + 1} of ${visible.length}`;
		return item.kind === 'plan'
			? `${position}, plan: ${item.plan.title}`
			: `${position}, chore: ${item.task.title}`;
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
</script>

{#if visible.length === 0}
	<a class="empty" href="/plans/new">
		<span class="empty-title">{emptyTitle}</span>
		<span class="empty-action">{emptyAction}</span>
	</a>
{:else}
	<section class="coming-up" aria-label="Coming up">
		<ol class="track" bind:this={track} onscroll={onScroll}>
			{#each visible as item, index (item.id)}
				<li class="slide" class:active={index === active}>
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
			<li class="slide slide-more" class:active={active === visible.length}>
				<span class="slide-glow" aria-hidden="true"></span>
				<div class="more">
					<GlassSurface radius={28} squish />
					<span class="more-body">
						<a href="/plans">All plans <Icon name="chevron" size={18} /></a>
						<a href="/lists/tasks">All tasks <Icon name="chevron" size={18} /></a>
					</span>
				</div>
			</li>
		</ol>

		{#if pageCount > 1}
			<div class="dots" aria-hidden="true">
				{#each { length: pageCount } as _, index (index)}
					<button
						type="button"
						class="dot"
						class:active={index === active}
						tabindex="-1"
						aria-label="Show card {index + 1}"
						onclick={() => goTo(index)}
					></button>
				{/each}
			</div>
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
		margin: -24px 0 -56px;
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
		background: rgb(255 255 255 / 0.05);
	}

	.dots {
		position: relative;
		display: flex;
		justify-content: center;
		gap: 6px;
		margin-top: 4px;
	}

	.dot {
		width: 6px;
		height: 6px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-pill);
		background: rgb(255 255 255 / 0.22);
		transition:
			width var(--duration-settle) var(--ease-spring),
			background-color var(--duration-quick) var(--ease-out);
	}

	.dot.active {
		width: 18px;
		background: var(--colour-accent);
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
