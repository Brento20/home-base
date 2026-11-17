import type { Profile } from '#lib/types.js';
import type { Debt } from './balances.js';
import { formatMoney } from './money.js';

/**
 * Plain-English balance lines, always from the signed-in person's side: "Chris owes you $40",
 * "You owe Chris $20", or "Sam owes Chris $10" when it doesn't involve you.
 */

export function nameOf(people: Profile[], id: string, me: string) {
	if (id === me) return 'You';
	return people.find((person) => person.id === id)?.displayName ?? 'Someone';
}

export function describeDebt(debt: Debt, people: Profile[], me: string) {
	const amount = formatMoney(debt.cents);
	if (debt.to === me) return `${nameOf(people, debt.from, me)} owes you ${amount}`;
	if (debt.from === me) return `You owe ${nameOf(people, debt.to, me)} ${amount}`;
	return `${nameOf(people, debt.from, me)} owes ${nameOf(people, debt.to, me)} ${amount}`;
}

/** Your overall position in a group. */
export function describeMyBalance(netCents: number) {
	if (netCents > 0) return `You’re owed ${formatMoney(netCents)}`;
	if (netCents < 0) return `You owe ${formatMoney(-netCents)}`;
	return 'All settled up';
}

/** "Chris paid you $40", "You paid Chris $40". */
export function describeSettlement(
	paidBy: string,
	paidTo: string,
	cents: number,
	people: Profile[],
	me: string
) {
	const from = nameOf(people, paidBy, me);
	const to = paidTo === me ? 'you' : nameOf(people, paidTo, me);
	return `${from} paid ${to} ${formatMoney(cents)}`;
}

/** "Chris owes you $10.00", "You owe Brenton $2.50" or "All settled up", between you and one person. */
export function describeBetween(netCents: number, otherName: string) {
	if (netCents > 0) return `${otherName} owes you ${formatMoney(netCents)}`;
	if (netCents < 0) return `You owe ${otherName} ${formatMoney(-netCents)}`;
	return 'All settled up';
}

/**
 * How one expense moves your balance, in cents. Positive: others owe you more (you paid more than
 * your share). Negative: you owe more (someone else paid for part of yours).
 */
export function myEffect(
	expense: {
		paidBy: string;
		amountCents: number;
		shares: { profileId: string; owedCents: number }[];
	},
	me: string
) {
	const mine = expense.shares.find((share) => share.profileId === me)?.owedCents ?? 0;
	return expense.paidBy === me ? expense.amountCents - mine : -mine;
}

/** The other person in a two-person group, or null when it's more (or fewer) people. */
export function onlyOther(people: Profile[], me: string) {
	const others = people.filter((person) => person.id !== me);
	return people.length === 2 && others.length === 1 ? others[0] : null;
}
