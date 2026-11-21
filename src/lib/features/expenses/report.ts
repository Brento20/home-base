import { addDays, daysBetween, isValidDateISO } from '#lib/time.js';
import { CATEGORIES, type CategoryKey } from './categories.js';
import { formatMoney } from './money.js';

/**
 * Spending reports: totals by category and over time for a date range, and two ranges side by
 * side in Compare mode. Reports count the full amount of each shared expense. Repayments only
 * move who owes whom, so they're never counted as spending.
 */

export interface ReportExpense {
	id: string;
	description: string;
	amountCents: number;
	category: CategoryKey;
	/** 'YYYY-MM-DD' */
	spentOn: string;
	paidBy: string;
}

/** Inclusive calendar dates, 'YYYY-MM-DD'. */
export interface DateRange {
	from: string;
	to: string;
}

export interface CategoryTotal {
	key: CategoryKey;
	label: string;
	colour: string;
	cents: number;
	count: number;
	/** Fraction of the range's total, 0 to 1. */
	share: number;
}

export interface SeriesPoint {
	/** First day of the bucket. */
	start: string;
	label: string;
	cents: number;
}

export interface Report {
	range: DateRange;
	totalCents: number;
	count: number;
	categories: CategoryTotal[];
	bucket: 'day' | 'week' | 'month';
	series: SeriesPoint[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

const monthIndex = (dateISO: string) => Number(dateISO.slice(5, 7)) - 1;
const lastDayOfMonth = (year: number, month: number) =>
	new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/** The whole calendar month containing a date. */
export function monthRange(dateISO: string): DateRange {
	const year = Number(dateISO.slice(0, 4));
	const month = monthIndex(dateISO);
	const mm = String(month + 1).padStart(2, '0');
	return {
		from: `${year}-${mm}-01`,
		to: `${year}-${mm}-${String(lastDayOfMonth(year, month)).padStart(2, '0')}`
	};
}

/** The month before or after (negative steps go back). */
export function shiftMonth(range: DateRange, steps: number): DateRange {
	const year = Number(range.from.slice(0, 4));
	const month = monthIndex(range.from) + steps;
	const date = new Date(Date.UTC(year, month, 1));
	return monthRange(date.toISOString().slice(0, 10));
}

export const isWholeMonth = (range: DateRange) => {
	const month = monthRange(range.from);
	return month.from === range.from && month.to === range.to;
};

/** Reads ?from=&to= from a URL, or null when they're missing or the wrong way round. */
export function parseRange(from: string | null, to: string | null): DateRange | null {
	if (!from || !to || !isValidDateISO(from) || !isValidDateISO(to) || from > to) return null;
	return { from, to };
}

const shortDate = (dateISO: string) => `${Number(dateISO.slice(8))} ${MONTHS[monthIndex(dateISO)]}`;

/** "November 2026", or "3 Nov to 16 Nov 2026" for anything that isn't a whole month. */
export function describeRange(range: DateRange): string {
	const year = range.from.slice(0, 4);
	if (isWholeMonth(range)) return `${MONTHS_LONG[monthIndex(range.from)]} ${year}`;
	const sameYear = year === range.to.slice(0, 4);
	return `${shortDate(range.from)}${sameYear ? '' : ` ${year}`} to ${shortDate(range.to)} ${range.to.slice(0, 4)}`;
}

/** Monday on or before a date. */
function weekStart(dateISO: string) {
	const weekday = (new Date(`${dateISO}T00:00:00Z`).getUTCDay() + 6) % 7;
	return addDays(dateISO, -weekday);
}

/** Days for a month or less, weeks up to about six months, months beyond that. */
function bucketFor(range: DateRange): Report['bucket'] {
	const days = daysBetween(range.from, range.to) + 1;
	if (days <= 35) return 'day';
	if (days <= 190) return 'week';
	return 'month';
}

function seriesFor(range: DateRange, bucket: Report['bucket'], expenses: ReportExpense[]) {
	const starts: string[] = [];
	if (bucket === 'day') {
		for (let day = range.from; day <= range.to; day = addDays(day, 1)) starts.push(day);
	} else if (bucket === 'week') {
		for (let day = weekStart(range.from); day <= range.to; day = addDays(day, 7)) starts.push(day);
	} else {
		for (let month = monthRange(range.from); month.from <= range.to; month = shiftMonth(month, 1))
			starts.push(month.from);
	}

	const keyOf = (dateISO: string) =>
		bucket === 'day' ? dateISO : bucket === 'week' ? weekStart(dateISO) : monthRange(dateISO).from;
	const totals = new Map(starts.map((start) => [start, 0]));
	for (const expense of expenses) {
		const key = keyOf(expense.spentOn);
		totals.set(key, (totals.get(key) ?? 0) + expense.amountCents);
	}

	return starts.map((start) => ({
		start,
		label:
			bucket === 'month'
				? `${MONTHS[monthIndex(start)]}${start.slice(5, 7) === '01' ? ` ${start.slice(2, 4)}` : ''}`
				: shortDate(start),
		cents: totals.get(start) ?? 0
	}));
}

export function buildReport(expenses: ReportExpense[], range: DateRange): Report {
	const inRange = expenses.filter((e) => e.spentOn >= range.from && e.spentOn <= range.to);
	const totalCents = inRange.reduce((sum, e) => sum + e.amountCents, 0);

	const categories = CATEGORIES.map((category) => {
		const matching = inRange.filter((e) => e.category === category.key);
		const cents = matching.reduce((sum, e) => sum + e.amountCents, 0);
		return {
			key: category.key,
			label: category.label,
			colour: category.colour,
			cents,
			count: matching.length,
			share: totalCents ? cents / totalCents : 0
		};
	})
		.filter((category) => category.count > 0)
		.sort((a, b) => b.cents - a.cents);

	const bucket = bucketFor(range);
	return {
		range,
		totalCents,
		count: inRange.length,
		categories,
		bucket,
		series: seriesFor(range, bucket, inRange)
	};
}

export interface CategoryChange {
	key: CategoryKey;
	label: string;
	colour: string;
	aCents: number;
	bCents: number;
	/** b minus a. */
	changeCents: number;
	/** Change as a fraction of a, or null when a was zero. */
	changeRatio: number | null;
}

export interface Comparison {
	a: Report;
	b: Report;
	changeCents: number;
	changeRatio: number | null;
	categories: CategoryChange[];
}

/** Range A is the one being compared against (usually the earlier one); B is compared to it. */
export function compareReports(a: Report, b: Report): Comparison {
	const ratio = (from: number, to: number) => (from ? (to - from) / from : null);
	const categories = CATEGORIES.map((category) => {
		const aCents = a.categories.find((c) => c.key === category.key)?.cents ?? 0;
		const bCents = b.categories.find((c) => c.key === category.key)?.cents ?? 0;
		return {
			key: category.key,
			label: category.label,
			colour: category.colour,
			aCents,
			bCents,
			changeCents: bCents - aCents,
			changeRatio: ratio(aCents, bCents)
		};
	})
		.filter((c) => c.aCents || c.bCents)
		.sort((x, y) => Math.max(y.aCents, y.bCents) - Math.max(x.aCents, x.bCents));

	return {
		a,
		b,
		changeCents: b.totalCents - a.totalCents,
		changeRatio: ratio(a.totalCents, b.totalCents),
		categories
	};
}

/** "Up $30.00 (33%)", "Down $12.50 (8%)", or "No change". */
export function describeChange(changeCents: number, ratio: number | null) {
	if (changeCents === 0) return 'No change';
	const direction = changeCents > 0 ? 'Up' : 'Down';
	const percent = ratio === null ? '' : ` (${Math.round(Math.abs(ratio) * 100)}%)`;
	return `${direction} ${formatMoney(Math.abs(changeCents))}${percent}`;
}

/**
 * Running total, day by day: [day 1's spending, days 1–2, …]. With `until`, the line stops there
 * (this month stops at today rather than running flat to the 30th).
 */
export function paceOf(expenses: ReportExpense[], range: DateRange, until?: string): number[] {
	const end = until && until < range.to ? until : range.to;
	if (end < range.from) return [];
	const byDay = new Map<string, number>();
	for (const expense of expenses) {
		if (expense.spentOn < range.from || expense.spentOn > end) continue;
		byDay.set(expense.spentOn, (byDay.get(expense.spentOn) ?? 0) + expense.amountCents);
	}
	const days = daysBetween(range.from, end) + 1;
	const pace: number[] = [];
	let running = 0;
	for (let i = 0; i < days; i++) {
		running += byDay.get(addDays(range.from, i)) ?? 0;
		pace.push(running);
	}
	return pace;
}

/** Who paid for what in a range, biggest payer first. */
export function paidByTotals(expenses: ReportExpense[], range: DateRange) {
	const totals = new Map<string, number>();
	for (const expense of expenses) {
		if (expense.spentOn < range.from || expense.spentOn > range.to) continue;
		totals.set(expense.paidBy, (totals.get(expense.paidBy) ?? 0) + expense.amountCents);
	}
	return [...totals]
		.map(([personId, cents]) => ({ personId, cents }))
		.sort((a, b) => b.cents - a.cents);
}

/** The biggest few expenses in a range. */
export function biggestExpenses(expenses: ReportExpense[], range: DateRange, count = 5) {
	return expenses
		.filter((e) => e.spentOn >= range.from && e.spentOn <= range.to)
		.sort((a, b) => b.amountCents - a.amountCents || b.spentOn.localeCompare(a.spentOn))
		.slice(0, count);
}

/** The range just before another, the same length (a whole month steps back a whole month). */
export function previousRange(range: DateRange): DateRange {
	if (isWholeMonth(range)) return shiftMonth(range, -1);
	const days = daysBetween(range.from, range.to) + 1;
	return { from: addDays(range.from, -days), to: addDays(range.from, -1) };
}
