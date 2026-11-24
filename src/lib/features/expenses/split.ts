import { formatMoney, parseMoney } from './money.js';

/**
 * Works out how much each person owes for an expense. Runs in the browser for the live preview
 * and again on the server before saving, so both always agree.
 *
 * Equal splits and percentages can't always divide evenly into cents. The leftover cents go one
 * each to the people with the largest remainders (ties to whoever's listed first), so the parts
 * always add up to the total exactly.
 */

export const SPLIT_METHODS = [
	{ key: 'equal', label: 'Equally' },
	{ key: 'exact', label: 'Exact amounts' },
	{ key: 'percent', label: 'Percent' }
] as const;

export type SplitMethod = (typeof SPLIT_METHODS)[number]['key'];

export const isSplitMethod = (value: string): value is SplitMethod =>
	SPLIT_METHODS.some((method) => method.key === value);

export interface SplitEntry {
	profileId: string;
	/**
	 * What was typed for this person: cents for exact amounts, or a percentage. Ignored for
	 * equal splits.
	 */
	input: number;
}

export interface Share {
	profileId: string;
	owedCents: number;
	/** Kept so the form reopens as it was typed. Null for equal splits. */
	input: number | null;
}

export type SplitResult =
	{ ok: true; shares: Share[] } | { ok: false; message: string; shares: Share[] };

/** Divides total cents in proportion to weights (1 each, or percentages), handing out leftover cents fairly. */
function allocate(totalCents: number, weights: number[]): number[] {
	const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
	const exact = weights.map((weight) => (totalCents * weight) / weightSum);
	const parts = exact.map(Math.floor);
	let leftover = totalCents - parts.reduce((sum, part) => sum + part, 0);
	const order = exact
		.map((value, index) => ({ index, remainder: value - Math.floor(value) }))
		.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
	for (const { index } of order) {
		if (leftover <= 0) break;
		parts[index] += 1;
		leftover -= 1;
	}
	return parts;
}

/** Before an amount's typed: a hint, not a problem (the form shows it quietly). */
export const NO_AMOUNT = 'Type the amount to see who owes what.';

export function computeShares(
	totalCents: number,
	method: SplitMethod,
	entries: SplitEntry[]
): SplitResult {
	const blank = entries.map((entry) => ({ profileId: entry.profileId, owedCents: 0, input: null }));
	if (entries.length === 0)
		return { ok: false, message: 'Include at least one person.', shares: [] };
	if (totalCents <= 0) return { ok: false, message: NO_AMOUNT, shares: blank };

	if (method === 'equal') {
		const parts = allocate(
			totalCents,
			entries.map(() => 1)
		);
		return {
			ok: true,
			shares: entries.map((entry, i) => ({ ...blank[i], owedCents: parts[i] }))
		};
	}

	if (entries.some((entry) => !Number.isFinite(entry.input) || entry.input < 0))
		return { ok: false, message: 'Check the numbers for each person.', shares: blank };

	if (method === 'exact') {
		const shares = entries.map((entry) => ({
			profileId: entry.profileId,
			owedCents: Math.round(entry.input),
			input: Math.round(entry.input)
		}));
		const assigned = shares.reduce((sum, share) => sum + share.owedCents, 0);
		if (assigned !== totalCents) {
			const gap = totalCents - assigned;
			return {
				ok: false,
				message: gap > 0 ? `${formatMoney(gap)} left to assign.` : `${formatMoney(-gap)} too much.`,
				shares
			};
		}
		return { ok: true, shares };
	}

	// Percent: the percentages have to add up to 100.
	const percents = entries.map((entry) => entry.input);
	const rounded = Math.round(percents.reduce((sum, p) => sum + p, 0) * 100) / 100;
	if (rounded !== 100) {
		const shares = entries.map((entry) => ({
			profileId: entry.profileId,
			owedCents: Math.round((totalCents * entry.input) / 100),
			input: entry.input
		}));
		return {
			ok: false,
			message:
				rounded < 100
					? `${trim(100 - rounded)}% left to assign.`
					: `${trim(rounded - 100)}% too much.`,
			shares
		};
	}

	const parts = allocate(totalCents, percents);
	return {
		ok: true,
		shares: entries.map((entry, i) => ({
			profileId: entry.profileId,
			owedCents: parts[i],
			input: entry.input
		}))
	};
}

const trim = (value: number) => String(Math.round(value * 100) / 100);

/**
 * Reads what was typed beside a person's name: dollars for exact amounts (as cents), otherwise a
 * plain number. Blank counts as zero; anything unreadable is NaN, which computeShares rejects.
 */
export function readSplitInput(method: SplitMethod, typed: string): number {
	const value = typed.trim();
	if (!value) return 0;
	if (method === 'exact') return parseMoney(value) ?? NaN;
	const number = Number(value.replace('%', ''));
	return Number.isFinite(number) ? number : NaN;
}
