/**
 * The settle-up nudge: a gentle note on Today once you owe more than the amount you chose in
 * Preferences ("You're about $120 behind with Chris"). Off unless you choose an amount. Pure.
 */
import type { ExpenseGroupSummary } from '#lib/types.js';

export const NUDGE_AMOUNTS = [50, 100, 200, 500] as const;
export type NudgeAmount = 0 | (typeof NUDGE_AMOUNTS)[number];

export interface SettleNudge {
	groupId: string;
	groupName: string;
	/** What you owe in that group. */
	cents: number;
	/** Who you'd pay most, to name them ("behind with Chris"); null when it's spread around. */
	to: string | null;
}

/** The group you're furthest behind in, once that's past `dollars`; null otherwise or when off. */
export function settleNudge(
	groups: ExpenseGroupSummary[],
	me: string,
	dollars: NudgeAmount
): SettleNudge | null {
	if (!dollars) return null;
	const behind = groups
		.filter((group) => group.myNetCents <= -dollars * 100)
		.sort((a, b) => a.myNetCents - b.myNetCents)[0];
	if (!behind) return null;
	const mine = behind.myDebts.filter((debt) => debt.from === me).sort((a, b) => b.cents - a.cents);
	return {
		groupId: behind.id,
		groupName: behind.name,
		cents: -behind.myNetCents,
		to: mine.length === 1 ? mine[0].to : null
	};
}

/** "about $120": to the nearest $10 from $100, the nearest $5 below, never "about $0". */
export function aboutAmount(cents: number): string {
	const dollars = cents / 100;
	const step = dollars >= 100 ? 10 : 5;
	return `$${Math.max(step, Math.round(dollars / step) * step).toLocaleString('en-AU')}`;
}
