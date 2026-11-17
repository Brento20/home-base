/**
 * Turns everyone's net balance into the fewest repayments that settle a group, the way Splitwise's
 * "simplify debts" does: the person owed the most is paid by whoever owes the most, and so on.
 * With two people that's simply "Chris owes you $40".
 */

export interface Balance {
	profileId: string;
	/** Positive: the group owes them. Negative: they owe the group. */
	netCents: number;
}

export interface Debt {
	from: string;
	to: string;
	cents: number;
}

export function simplifyDebts(balances: Balance[]): Debt[] {
	const owed = balances
		.filter((b) => b.netCents > 0)
		.map((b) => ({ ...b }))
		.sort((a, b) => b.netCents - a.netCents || a.profileId.localeCompare(b.profileId));
	const owing = balances
		.filter((b) => b.netCents < 0)
		.map((b) => ({ ...b, netCents: -b.netCents }))
		.sort((a, b) => b.netCents - a.netCents || a.profileId.localeCompare(b.profileId));

	const debts: Debt[] = [];
	let i = 0;
	let j = 0;
	while (i < owed.length && j < owing.length) {
		const cents = Math.min(owed[i].netCents, owing[j].netCents);
		debts.push({ from: owing[j].profileId, to: owed[i].profileId, cents });
		owed[i].netCents -= cents;
		owing[j].netCents -= cents;
		if (owed[i].netCents === 0) i++;
		if (owing[j].netCents === 0) j++;
	}
	return debts;
}

/** Works out balances from scratch. Used in sample mode; the database does this for real data. */
export function computeBalances(
	memberIds: string[],
	expenses: {
		paidBy: string;
		amountCents: number;
		shares: { profileId: string; owedCents: number }[];
	}[],
	settlements: { paidBy: string; paidTo: string; amountCents: number }[]
): Balance[] {
	const net = new Map(memberIds.map((id) => [id, 0]));
	const add = (id: string, cents: number) => net.set(id, (net.get(id) ?? 0) + cents);
	for (const expense of expenses) {
		add(expense.paidBy, expense.amountCents);
		for (const share of expense.shares) add(share.profileId, -share.owedCents);
	}
	for (const payment of settlements) {
		add(payment.paidBy, payment.amountCents);
		add(payment.paidTo, -payment.amountCents);
	}
	return [...net].map(([profileId, netCents]) => ({ profileId, netCents }));
}
