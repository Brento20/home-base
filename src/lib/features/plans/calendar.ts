import { LOCALE } from '#lib/home.js';
import { addDays, isValidDateISO, zonedParts } from '#lib/time.js';
import type { Plan, Task } from '#lib/types.js';

/**
 * The month view on Plans. Months are 'YYYY-MM'; weeks start on Monday, as Australian
 * calendars do. Every grid is six weeks, so the page doesn't jump between months.
 */

export interface CalendarDay {
	date: string;
	/** In the month being shown (the rest fill the first and last weeks). */
	inMonth: boolean;
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isValidMonth = (value: string) => MONTH.test(value);

export const monthOf = (dateISO: string) => dateISO.slice(0, 7);

/** The month `count` months away: shiftMonth('2026-11', 2) is '2027-01'. */
export function shiftMonth(month: string, count: number) {
	const [year, monthNumber] = month.split('-').map(Number);
	const total = year * 12 + (monthNumber - 1) + count;
	return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

const monthYear = new Intl.DateTimeFormat(LOCALE, {
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});
const monthOnly = new Intl.DateTimeFormat(LOCALE, { month: 'long', timeZone: 'UTC' });

/** "November", or "January 2027" when it isn't this year. */
export function monthLabel(month: string, today: string) {
	const date = new Date(`${month}-01T00:00:00Z`);
	return month.slice(0, 4) === today.slice(0, 4) ? monthOnly.format(date) : monthYear.format(date);
}

/** Six Monday-first weeks covering the month. */
export function monthGrid(month: string): CalendarDay[][] {
	const first = `${month}-01`;
	const weekday = new Date(`${first}T00:00:00Z`).getUTCDay(); // 0 = Sunday
	const start = addDays(first, -((weekday + 6) % 7));
	return Array.from({ length: 6 }, (_, week) =>
		Array.from({ length: 7 }, (_, day) => {
			const date = addDays(start, week * 7 + day);
			return { date, inMonth: monthOf(date) === month };
		})
	);
}

/** The first and the day after the last date on a month's grid. */
export function gridRange(month: string) {
	const weeks = monthGrid(month);
	return { from: weeks[0][0].date, until: addDays(weeks[5][6].date, 1) };
}

/** Every household-local date a plan covers: one for most, each day of a multi-day plan. */
export function planDates(plan: Plan): string[] {
	const first = zonedParts(new Date(plan.startsAt)).date;
	if (!plan.endsAt) return [first];
	// An all-day plan ends at the midnight after its last day; a timed one on its end day.
	const end = new Date(new Date(plan.endsAt).getTime() - (plan.allDay ? 1 : 0));
	const last = zonedParts(end).date;
	const dates = [first];
	// A cap, so a plan saved with a far-off end can't make a huge list.
	while (dates.at(-1)! < last && dates.length < 62) dates.push(addDays(dates.at(-1)!, 1));
	return dates;
}

/** One thing on a day in the month view: a plan or a dinner. */
export type CalendarEntry =
	| { kind: 'plan'; id: string; sort: string; plan: Plan }
	| { kind: 'dinner'; id: string; sort: string; dinner: Task };

/** Dinners without a time sort as if at 6 pm, where dinner usually is. */
const DINNER_SORT_TIME = '18:00';

/**
 * Everything on each date, in the order the day goes: all-day plans first, then timed plans
 * and dinners by time.
 */
export function entriesByDate(plans: Plan[], dinners: Task[]) {
	const byDate = new Map<string, CalendarEntry[]>();
	const add = (date: string, entry: CalendarEntry) => {
		const list = byDate.get(date) ?? [];
		list.push(entry);
		byDate.set(date, list);
	};
	for (const plan of plans) {
		const dates = planDates(plan);
		const startTime = zonedParts(new Date(plan.startsAt)).time;
		dates.forEach((date, index) => {
			// All day, or a day a longer plan carries on into: before the timed things.
			const sort =
				plan.allDay || index > 0 ? `0${index === 0 ? startTime : '00:00'}` : `1${startTime}`;
			add(date, { kind: 'plan', id: plan.id, sort, plan });
		});
	}
	for (const dinner of dinners) {
		if (!dinner.dueOn) continue;
		add(dinner.dueOn, {
			kind: 'dinner',
			id: dinner.id,
			sort: `1${dinner.dueTime ?? DINNER_SORT_TIME}`,
			dinner
		});
	}
	for (const list of byDate.values()) list.sort((a, b) => a.sort.localeCompare(b.sort));
	return byDate;
}

/** The month to show from ?month=, falling back to this month. */
export function monthFromParam(value: string | null, today: string) {
	if (value && isValidMonth(value)) return value;
	if (value && isValidDateISO(value)) return monthOf(value);
	return monthOf(today);
}
