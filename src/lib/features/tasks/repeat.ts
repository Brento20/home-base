import { addDays } from '#lib/time.js';

/**
 * How often a chore comes back. The database works out the next occurrence when one is ticked
 * off (next_occurrence in 20261118000200_more_task_repeats.sql); sample mode uses nextDueDate
 * below, which follows the same rules.
 */
export const REPEATS = [
	{ key: 'none', label: 'Once', describe: null },
	{ key: 'weekly', label: 'Weekly', describe: 'repeats weekly' },
	{ key: 'fortnightly', label: 'Every 2 weeks', describe: 'repeats every 2 weeks' },
	{ key: 'monthly', label: 'Monthly', describe: 'repeats monthly' }
] as const;

export type Repeat = (typeof REPEATS)[number]['key'];

export const isRepeat = (value: string): value is Repeat =>
	REPEATS.some((repeat) => repeat.key === value);

/** "Every 2 weeks", for the repeat icon's tooltip; empty for one-off tasks. */
export const repeatLabel = (repeat: Repeat) =>
	repeat === 'none' ? '' : (REPEATS.find((r) => r.key === repeat)?.label ?? '');

/** "repeats every 2 weeks", for screen readers and Past tasks; null for one-off tasks. */
export const describeRepeat = (repeat: Repeat) =>
	REPEATS.find((r) => r.key === repeat)?.describe ?? null;

const daysInMonth = (year: number, month: number) =>
	new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/** One repeat after a date. Monthly keeps its day, falling back to shorter months' last day. */
export function nextOccurrence(
	dateISO: string,
	repeat: Exclude<Repeat, 'none'>,
	anchorDay: number
) {
	if (repeat === 'weekly') return addDays(dateISO, 7);
	if (repeat === 'fortnightly') return addDays(dateISO, 14);
	const year = Number(dateISO.slice(0, 4));
	const month = Number(dateISO.slice(5, 7)); // next month, 0-based
	const nextYear = month === 12 ? year + 1 : year;
	const nextMonth = month % 12;
	const day = Math.min(anchorDay, daysInMonth(nextYear, nextMonth));
	return `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** The next due date after ticking off a chore: one repeat on, then on again until after today. */
export function nextDueDate(
	dueOn: string | null,
	repeat: Exclude<Repeat, 'none'>,
	today: string,
	anchorDay = Number((dueOn ?? today).slice(8, 10))
) {
	let next = nextOccurrence(dueOn ?? today, repeat, anchorDay);
	while (next <= today) next = nextOccurrence(next, repeat, anchorDay);
	return next;
}
