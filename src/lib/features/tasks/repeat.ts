import { addDays } from '#lib/time.js';

/**
 * How often a chore comes back: once, weekly, every 2 weeks, monthly, or every N days, weeks,
 * months or years (stored as "every-3-months"). The database works out the next occurrence when
 * one is ticked off (next_occurrence in 20261120000000_custom_repeats.sql); sample mode uses
 * nextDueDate below, which follows the same rules.
 */
export const REPEATS = [
	{ key: 'none', label: 'Once' },
	{ key: 'weekly', label: 'Weekly' },
	{ key: 'fortnightly', label: 'Every 2 weeks' },
	{ key: 'monthly', label: 'Monthly' }
] as const;

export const REPEAT_UNITS = ['days', 'weeks', 'months', 'years'] as const;
export type RepeatUnit = (typeof REPEAT_UNITS)[number];
export const REPEAT_EVERY_MAX = 99;

type Preset = (typeof REPEATS)[number]['key'];
export type Repeat = Preset | `every-${number}-${RepeatUnit}`;

/** Every how many of what. Null for a one-off. */
export interface RepeatRule {
	every: number;
	unit: RepeatUnit;
}

const CUSTOM = /^every-([1-9]\d?)-(days|weeks|months|years)$/;

export const isRepeat = (value: string): value is Repeat =>
	REPEATS.some((repeat) => repeat.key === value) || CUSTOM.test(value);

export function ruleOf(repeat: Repeat): RepeatRule | null {
	if (repeat === 'none') return null;
	if (repeat === 'weekly') return { every: 1, unit: 'weeks' };
	if (repeat === 'fortnightly') return { every: 2, unit: 'weeks' };
	if (repeat === 'monthly') return { every: 1, unit: 'months' };
	const match = repeat.match(CUSTOM);
	return match ? { every: Number(match[1]), unit: match[2] as RepeatUnit } : null;
}

/** A rule as a repeat, using the plain names where there is one (1 week is "weekly"). */
export function repeatFor(every: number, unit: RepeatUnit): Repeat {
	const n = Math.min(REPEAT_EVERY_MAX, Math.max(1, Math.round(every) || 1));
	if (unit === 'weeks' && n === 1) return 'weekly';
	if (unit === 'weeks' && n === 2) return 'fortnightly';
	if (unit === 'months' && n === 1) return 'monthly';
	return `every-${n}-${unit}`;
}

/** Is it one of the four quick choices, or a custom one? */
export const isPreset = (repeat: Repeat): repeat is Preset =>
	REPEATS.some((option) => option.key === repeat);

/**
 * Reads the Repeat choice from a form: a quick choice (`repeat`), or `repeat` = custom with
 * `repeatEvery` and `repeatUnit`. Anything unreadable is a one-off.
 */
export function repeatFromForm(form: FormData): Repeat {
	const value = String(form.get('repeat') ?? '');
	if (value === 'custom') {
		const unit = String(form.get('repeatUnit') ?? '');
		const every = Number(form.get('repeatEvery'));
		if ((REPEAT_UNITS as readonly string[]).includes(unit))
			return repeatFor(every, unit as RepeatUnit);
		return 'none';
	}
	return isRepeat(value) ? value : 'none';
}

const SINGULAR: Record<RepeatUnit, string> = {
	days: 'day',
	weeks: 'week',
	months: 'month',
	years: 'year'
};

/** "Weekly", "Every 3 months", "Daily", "Yearly"; empty for one-off tasks. */
export function repeatLabel(repeat: Repeat): string {
	const preset = REPEATS.find((option) => option.key === repeat);
	if (preset) return repeat === 'none' ? '' : preset.label;
	const rule = ruleOf(repeat);
	if (!rule) return '';
	if (rule.every === 1)
		return rule.unit === 'days'
			? 'Daily'
			: rule.unit === 'years'
				? 'Yearly'
				: `Every ${SINGULAR[rule.unit]}`;
	return `Every ${rule.every} ${rule.unit}`;
}

/** "repeats every 3 months", for screen readers and Past tasks; null for one-off tasks. */
export function describeRepeat(repeat: Repeat): string | null {
	const label = repeatLabel(repeat);
	return label ? `repeats ${label.toLowerCase()}` : null;
}

const daysInMonth = (year: number, month: number) =>
	new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/** A date some months on, keeping the anchor day or falling back to that month's last day. */
function addMonths(dateISO: string, months: number, anchorDay: number) {
	const index = Number(dateISO.slice(0, 4)) * 12 + Number(dateISO.slice(5, 7)) - 1 + months;
	const year = Math.floor(index / 12);
	const month = index % 12;
	const day = Math.min(anchorDay, daysInMonth(year, month));
	return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** One repeat after a date. Months and years keep their day, like the database does. */
export function nextOccurrence(
	dateISO: string,
	repeat: Exclude<Repeat, 'none'>,
	anchorDay: number
) {
	const rule = ruleOf(repeat);
	if (!rule) return dateISO;
	if (rule.unit === 'days') return addDays(dateISO, rule.every);
	if (rule.unit === 'weeks') return addDays(dateISO, 7 * rule.every);
	return addMonths(dateISO, rule.unit === 'years' ? 12 * rule.every : rule.every, anchorDay);
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
