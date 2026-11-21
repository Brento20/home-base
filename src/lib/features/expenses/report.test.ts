import { describe, expect, it } from 'vitest';
import {
	biggestExpenses,
	describeRange,
	monthRange,
	paceOf,
	paidByTotals,
	previousRange
} from './report.js';

const spend = (spentOn: string, amountCents: number, paidBy = 'b') => ({
	id: `${spentOn}-${amountCents}`,
	description: 'x',
	amountCents,
	category: 'groceries' as const,
	spentOn,
	paidBy
});
const november = monthRange('2026-11-20');

describe('ranges', () => {
	it('finds the whole month and the one before', () => {
		expect(november).toEqual({ from: '2026-11-01', to: '2026-11-30' });
		expect(previousRange(november)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
		expect(previousRange(monthRange('2026-01-10'))).toEqual({
			from: '2025-12-01',
			to: '2025-12-31'
		});
	});

	it('steps back a custom range by its own length', () => {
		expect(previousRange({ from: '2026-11-10', to: '2026-11-16' })).toEqual({
			from: '2026-11-03',
			to: '2026-11-09'
		});
	});

	it('names ranges in words', () => {
		expect(describeRange(november)).toBe('November 2026');
		expect(describeRange({ from: '2026-11-03', to: '2026-11-16' })).toBe('3 Nov to 16 Nov 2026');
	});
});

describe('paceOf', () => {
	const expenses = [spend('2026-11-01', 1000), spend('2026-11-03', 500), spend('2026-10-31', 9999)];

	it('runs a total day by day, ignoring other months', () => {
		expect(paceOf(expenses, november).slice(0, 4)).toEqual([1000, 1000, 1500, 1500]);
		expect(paceOf(expenses, november)).toHaveLength(30);
	});

	it('stops at today for this month', () => {
		expect(paceOf(expenses, november, '2026-11-05')).toHaveLength(5);
	});
});

describe('who paid and the biggest spends', () => {
	const expenses = [
		spend('2026-11-02', 3000, 'b'),
		spend('2026-11-04', 5000, 'c'),
		spend('2026-11-05', 1000, 'b')
	];

	it('totals by payer, biggest first', () => {
		expect(paidByTotals(expenses, november)).toEqual([
			{ personId: 'c', cents: 5000 },
			{ personId: 'b', cents: 4000 }
		]);
	});

	it('lists the biggest first', () => {
		expect(biggestExpenses(expenses, november, 2).map((e) => e.amountCents)).toEqual([5000, 3000]);
	});
});
