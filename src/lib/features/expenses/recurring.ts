/**
 * Recurring bills: how often, how that reads, and the next date, counted from the first date
 * so a bill on the 31st stays on the 31st (or the month's last day). Mirrors
 * public.next_recurring_date() in the database, for sample mode and for showing the next date.
 */
import { addDays } from '#lib/time.js';
import type { CategoryKey } from './categories.js';
import type { Share, SplitMethod } from './split.js';

/** A bill that adds itself: what, how much, who paid and the shares, and how often. */
export interface RecurringBill {
	id: string;
	groupId: string;
	description: string;
	amountCents: number;
	paidBy: string;
	category: CategoryKey;
	splitMethod: SplitMethod;
	shares: Share[];
	frequency: Frequency;
	startOn: string;
	addedCount: number;
	/** The next date it'll add itself on. */
	nextOn: string;
	/** Paused by someone, or by itself when it couldn't be added (someone left the group). */
	paused: boolean;
}

export const FREQUENCIES = [
	{ value: 'weekly', label: 'Weekly', every: 'every week' },
	{ value: 'fortnightly', label: 'Fortnightly', every: 'every two weeks' },
	{ value: 'monthly', label: 'Monthly', every: 'every month' },
	{ value: 'quarterly', label: 'Quarterly', every: 'every three months' },
	{ value: 'yearly', label: 'Yearly', every: 'every year' }
] as const;

export type Frequency = (typeof FREQUENCIES)[number]['value'];

export const isFrequency = (value: unknown): value is Frequency =>
	FREQUENCIES.some((frequency) => frequency.value === value);

export const frequencyLabel = (frequency: Frequency) =>
	FREQUENCIES.find((entry) => entry.value === frequency)!.label;

/** `start` moved on `steps` periods: Jan 31 monthly is Feb 28, then Mar 31. */
export function nextRecurringDate(start: string, frequency: Frequency, steps: number): string {
	if (frequency === 'weekly') return addDays(start, 7 * steps);
	if (frequency === 'fortnightly') return addDays(start, 14 * steps);
	const months =
		frequency === 'monthly' ? steps : frequency === 'quarterly' ? 3 * steps : 12 * steps;
	const [year, month, day] = start.split('-').map(Number);
	const target = new Date(Date.UTC(year, month - 1 + months, 1));
	const lastDay = new Date(
		Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
	).getUTCDate();
	target.setUTCDate(Math.min(day, lastDay));
	return target.toISOString().slice(0, 10);
}
