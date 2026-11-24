<script lang="ts">
	/**
	 * Plans and dinners as a month: a glass calendar with dots under each day (the accent for plans,
	 * lilac for dinner) and the chosen day listed underneath. Tap a day to see it; swipe the
	 * calendar or use the arrows to change month.
	 */
	import { fly } from 'svelte/transition';
	import { afterNavigate, goto } from '$app/navigation';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { formatDayLabel, formatLongDate, formatTimeOfDay } from '#lib/time.js';
	import type { Plan, Profile, Task } from '#lib/types.js';
	import { entriesByDate, monthGrid, monthLabel, monthOf, shiftMonth } from './calendar.js';
	import EntryCard from './EntryCard.svelte';
	import PlanRow from './PlanRow.svelte';

	interface Props {
		month: string;
		plans: Plan[];
		dinners: Task[];
		/** The month's plans and dinners are on their way. */
		loading?: boolean;
		/** They couldn't be fetched. */
		failed?: boolean;
		people: Profile[];
		today: string;
		now: string;
	}

	let {
		month: loadedMonth,
		plans,
		dinners,
		loading = false,
		failed = false,
		people,
		today,
		now
	}: Props = $props();

	// The month you asked for shows the moment you ask (a swipe, an arrow, Today), before the
	// page has finished moving there; its plans and dinners fade in when they arrive. Entries
	// always belong to the loaded month, so while another is showing they're held back.
	let asked = $state<string | null>(null);
	const month = $derived(asked ?? loadedMonth);
	const waiting = $derived(loading || month !== loadedMonth);
	afterNavigate(() => (asked = null));

	const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	const weeks = $derived(monthGrid(month));
	const byDate = $derived(
		waiting ? (new Map() as ReturnType<typeof entriesByDate>) : entriesByDate(plans, dinners)
	);
	const shownDates = $derived(new Set(weeks.flat().map((day) => day.date)));

	// The day you tapped, or today when it's on screen, or the 1st.
	let picked = $state<string | null>(null);
	const selected = $derived.by(() => {
		if (picked && shownDates.has(picked)) return picked;
		return monthOf(today) === month ? today : `${month}-01`;
	});
	const dayEntries = $derived(byDate.get(selected) ?? []);

	const monthHref = (target: string) => `/plans?view=calendar&month=${target}`;

	function counts(date: string) {
		const entries = byDate.get(date) ?? [];
		const dinner = entries.filter((entry) => entry.kind === 'dinner').length;
		return { plans: entries.length - dinner, dinner };
	}

	function dayName(date: string) {
		const { plans: planCount, dinner } = counts(date);
		const parts = [
			planCount === 1 ? '1 plan' : planCount ? `${planCount} plans` : '',
			dinner ? 'dinner planned' : ''
		].filter(Boolean);
		return [formatLongDate(date, today), ...parts].join(', ');
	}

	const isOver = (plan: Plan) =>
		!plan.allDay && new Date(plan.endsAt ?? plan.startsAt).getTime() < new Date(now).getTime();

	// "Today · Thursday 19 November"; other days just the date.
	function dayHeading(date: string) {
		const near = formatDayLabel(date, today);
		const long = formatLongDate(date, today);
		return ['Today', 'Tomorrow', 'Yesterday'].includes(near) ? `${near} · ${long}` : long;
	}

	function cook(dinner: Task) {
		if (dinner.completedAt) return 'Cooked';
		const person = people.find((member) => member.id === dinner.assigneeId);
		return `${person ? person.displayName : 'Anyone'} cooking`;
	}

	// Cooked dinners open the recipe; ones still to come open the cook view.
	const dinnerHref = (dinner: Task) =>
		dinner.completedAt && dinner.recipeId
			? `/dinner/${dinner.recipeId}`
			: `/dinner/cook/${dinner.id}`;

	// Which way the next month slides in: 1 from the right (later), -1 from the left.
	let direction = $state(1);
	const reduceMotion =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	function changeMonth(step: 1 | -1) {
		goToMonth(shiftMonth(month, step), step);
	}

	/** Shows a month straight away, then moves the page there (replacing, so Back leaves). */
	function goToMonth(target: string, step: 1 | -1) {
		direction = step;
		asked = target === loadedMonth ? null : target;
		goto(monthHref(target), { replace: true, reset: false });
	}

	/** The arrows and Today are real links (new tab, no script); a tap goes the quick way. */
	function follow(event: MouseEvent, target: string, step: 1 | -1) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
		event.preventDefault();
		goToMonth(target, step);
	}

	// A sideways swipe on the calendar changes month (an up-and-down one still scrolls).
	let touchStart: { x: number; y: number } | null = null;

	function onTouchStart(event: TouchEvent) {
		if (event.touches.length !== 1) return;
		touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
	}

	function onTouchEnd(event: TouchEvent) {
		if (!touchStart) return;
		const touch = event.changedTouches[0];
		const dx = touch.clientX - touchStart.x;
		const dy = touch.clientY - touchStart.y;
		touchStart = null;
		if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
		changeMonth(dx < 0 ? 1 : -1);
	}
</script>

<section class="calendar" aria-label="Plans by month">
	<header class="month-bar">
		<h2 class="month">{monthLabel(month, today)}</h2>
		<div class="month-actions">
			{#if monthOf(today) !== month}
				<a
					class="today-link"
					href={monthHref(monthOf(today))}
					data-sveltekit-replacestate
					data-sveltekit-reset="false"
					onclick={(event) => follow(event, monthOf(today), monthOf(today) > month ? 1 : -1)}
					>Today</a
				>
			{/if}
			<a
				class="step"
				href={monthHref(shiftMonth(month, -1))}
				aria-label="Previous month"
				data-sveltekit-replacestate
				data-sveltekit-reset="false"
				onclick={(event) => follow(event, shiftMonth(month, -1), -1)}
			>
				<Icon name="back" size={20} />
			</a>
			<a
				class="step"
				href={monthHref(shiftMonth(month, 1))}
				aria-label="Next month"
				data-sveltekit-replacestate
				data-sveltekit-reset="false"
				onclick={(event) => follow(event, shiftMonth(month, 1), 1)}
			>
				<Icon name="chevron" size={20} />
			</a>
		</div>
	</header>

	<!-- Its own swipe (months), so the app's swipe between tabs leaves it alone. -->
	<div
		class="grid-card"
		role="group"
		aria-label="{monthLabel(month, today)} calendar"
		aria-busy={waiting}
		data-gesture-ignore
		ontouchstart={onTouchStart}
		ontouchend={onTouchEnd}
		ontouchcancel={() => (touchStart = null)}
	>
		<GlassSurface radius={26} />
		{#key month}
			<div
				class="grid"
				in:fly={{ x: reduceMotion ? 0 : direction * 36, duration: reduceMotion ? 0 : 260 }}
			>
				<div class="weekdays" aria-hidden="true">
					{#each WEEKDAYS as name, index (name)}<span class:weekend={index >= 5}
							>{name.slice(0, 1)}</span
						>{/each}
				</div>
				{#each weeks as week (week[0].date)}
					<div class="week">
						{#each week as day (day.date)}
							{@const count = counts(day.date)}
							<button
								type="button"
								class="day"
								class:outside={!day.inMonth}
								class:today={day.date === today}
								class:selected={day.date === selected}
								aria-pressed={day.date === selected}
								aria-label={dayName(day.date)}
								onclick={() => (picked = day.date)}
							>
								<span class="number">{Number(day.date.slice(8))}</span>
								<span class="dots" aria-hidden="true">
									{#each { length: Math.min(count.plans, count.dinner ? 2 : 3) } as _, index (index)}<span
											class="dot"
										></span>{/each}{#if count.dinner}<span class="dot dinner"></span>{/if}
								</span>
							</button>
						{/each}
					</div>
				{/each}
			</div>
		{/key}
	</div>

	<p class="key" aria-hidden="true">
		<span><span class="dot"></span> Plans</span>
		<span><span class="dot dinner"></span> Dinner</span>
	</p>

	<section class="day-plans" aria-live="polite" aria-labelledby="selected-day">
		<h3 id="selected-day" class="day-label caption-label">{dayHeading(selected)}</h3>
		{#if dayEntries.length}
			<ul>
				{#each dayEntries as entry (entry.kind + entry.id)}
					{#if entry.kind === 'plan'}
						<PlanRow plan={entry.plan} past={isOver(entry.plan)} />
					{:else}
						{@const dinner = entry.dinner}
						<li>
							<EntryCard
								href={dinnerHref(dinner)}
								when="Dinner{dinner.dueTime ? ` · ${formatTimeOfDay(dinner.dueTime)}` : ''}"
								icon="dinner"
								tone="dinner"
								title={dinner.recipe?.title ?? dinner.title}
								detail={cook(dinner)}
								past={!!dinner.completedAt}
							/>
						</li>
					{/if}
				{/each}
			</ul>
		{:else if waiting}
			<p class="nothing" aria-busy="true">Looking…</p>
		{:else if failed}
			<p class="nothing">Couldn’t load this month. Pull down to try again.</p>
		{:else}
			<p class="nothing">
				Nothing on.
				{#if selected >= today}
					<a class="add" href="/plans/new?date={selected}">
						<Icon name="plus" size={16} /> Add a plan
					</a>
					<a class="add" href="/lists/tasks/new?date={selected}">
						<Icon name="plus" size={16} /> Add a task
					</a>
				{/if}
			</p>
		{/if}
	</section>
</section>

<style>
	.month-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-s);
		margin-bottom: var(--space-s);
	}

	/* Smaller than the page title, so "Plans" stays the heading. */
	.month {
		margin: 0 0 0 4px;
		font-size: 1.375rem;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
	}

	.month-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.today-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		padding: 0 10px;
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
		color: var(--colour-accent);
		text-decoration: none;
	}

	.step {
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		border-radius: 50%;
		color: var(--colour-text);
	}

	.step:active {
		background: var(--colour-hairline);
	}

	.grid-card {
		position: relative;
		border-radius: 26px;
	}

	.grid-card {
		overflow: hidden;
	}

	.grid {
		position: relative;
		padding: 10px 8px 8px;
	}

	.weekdays,
	.week {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
	}

	/*
	 * The day letters read as a header, not as dates (as in the iPhone's Calendar): small, bold,
	 * spaced initials in the secondary colour, on their own band above a hairline. Weekends
	 * are a step quieter.
	 */
	.weekdays {
		margin-bottom: 6px;
		padding-bottom: 8px;
		box-shadow: inset 0 -1px 0 var(--colour-hairline);
	}

	.weekdays span {
		font-size: 0.6875rem;
		font-weight: var(--weight-strong);
		letter-spacing: 0.06em;
		text-align: center;
		color: var(--colour-text-muted);
	}

	.weekdays .weekend {
		color: var(--colour-text-faint);
	}

	.day {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		min-height: 48px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--colour-text);
		font: inherit;
		-webkit-tap-highlight-color: transparent;
	}

	.number {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		font-size: var(--text-body);
		font-variant-numeric: tabular-nums;
		transition: background var(--duration-quick) var(--ease-out);
	}

	.outside .number {
		color: var(--colour-text-faint);
	}

	.today .number {
		color: var(--colour-accent);
		font-weight: var(--weight-strong);
	}

	.selected .number {
		background: var(--colour-accent);
		color: var(--colour-on-accent);
		font-weight: var(--weight-strong);
	}

	.day:focus-visible {
		outline: none;
	}

	.day:focus-visible .number {
		box-shadow: 0 0 0 2px var(--colour-accent);
	}

	.dots {
		display: flex;
		gap: 3px;
		height: 5px;
	}

	.dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--colour-accent);
		/* Dots arrive after their month (they stream in): fade them in rather than pop. */
		animation: dot-in 220ms ease-out both;
	}

	@keyframes dot-in {
		from {
			opacity: 0;
			scale: 0.4;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
		}
	}

	.dot.dinner {
		background: var(--colour-dinner);
	}

	.outside .dot {
		opacity: 0.45;
	}

	/* Says what the colours mean, so colour isn't the only clue. */
	.key {
		display: flex;
		justify-content: center;
		gap: var(--space-l);
		margin: 10px 0 0;
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.key > span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	li {
		list-style: none;
	}

	.day-plans {
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

	.nothing {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px 12px;
		margin: 0 0 0 4px;
		color: var(--colour-text-muted);
	}

	.add {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: var(--tap-target);
		font-weight: var(--weight-medium);
		color: var(--colour-accent);
		text-decoration: none;
	}
</style>
