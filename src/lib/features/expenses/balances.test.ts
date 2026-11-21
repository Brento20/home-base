import { describe, expect, it } from 'vitest';
import { computeBalances, simplifyDebts } from './balances.js';

describe('simplifyDebts', () => {
	it('turns two people into one repayment', () => {
		expect(
			simplifyDebts([
				{ profileId: 'b', netCents: 4000 },
				{ profileId: 'c', netCents: -4000 }
			])
		).toEqual([{ from: 'c', to: 'b', cents: 4000 }]);
	});

	it('settles a group in the fewest payments, and every balance reaches zero', () => {
		const balances = [
			{ profileId: 'a', netCents: 5000 },
			{ profileId: 'b', netCents: 1000 },
			{ profileId: 'c', netCents: -2500 },
			{ profileId: 'd', netCents: -3500 }
		];
		const debts = simplifyDebts(balances);
		expect(debts.length).toBeLessThanOrEqual(balances.length - 1);
		const net = new Map(balances.map((b) => [b.profileId, b.netCents]));
		for (const debt of debts) {
			net.set(debt.from, net.get(debt.from)! + debt.cents);
			net.set(debt.to, net.get(debt.to)! - debt.cents);
		}
		expect([...net.values()].every((v) => v === 0)).toBe(true);
	});

	it('has nothing to settle when everyone is square', () => {
		expect(simplifyDebts([{ profileId: 'a', netCents: 0 }])).toEqual([]);
	});
});

describe('computeBalances', () => {
	it('credits the payer, debits the shares, and counts settlements', () => {
		const balances = computeBalances(
			['b', 'c'],
			[
				{
					paidBy: 'b',
					amountCents: 10000,
					shares: [
						{ profileId: 'b', owedCents: 5000 },
						{ profileId: 'c', owedCents: 5000 }
					]
				}
			],
			[{ paidBy: 'c', paidTo: 'b', amountCents: 2000 }]
		);
		expect(balances).toEqual([
			{ profileId: 'b', netCents: 3000 },
			{ profileId: 'c', netCents: -3000 }
		]);
	});
});
