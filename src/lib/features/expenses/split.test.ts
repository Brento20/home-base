import { describe, expect, it } from 'vitest';
import { computeShares, readSplitInput } from './split.js';

const people = (...inputs: number[]) =>
	inputs.map((input, i) => ({ profileId: ['a', 'b', 'c', 'd'][i], input }));
const owed = (result: ReturnType<typeof computeShares>) => result.shares.map((s) => s.owedCents);

describe('computeShares', () => {
	it('splits equally, handing leftover cents to the first in line', () => {
		const result = computeShares(1000, 'equal', people(0, 0, 0));
		expect(result.ok).toBe(true);
		expect(owed(result)).toEqual([334, 333, 333]);
	});

	it('always adds up to the total exactly', () => {
		for (const total of [1, 7, 99, 1001, 123457]) {
			for (const count of [1, 2, 3, 4]) {
				const result = computeShares(total, 'equal', people(...Array(count).fill(0)));
				expect(owed(result).reduce((a, b) => a + b, 0)).toBe(total);
			}
		}
	});

	it('checks exact amounts add up, and says what is left', () => {
		expect(computeShares(5000, 'exact', people(3000, 2000)).ok).toBe(true);
		const short = computeShares(5000, 'exact', people(3000, 1000));
		expect(short.ok).toBe(false);
		expect(short.ok === false && short.message).toBe('$10.00 left to assign.');
		const over = computeShares(5000, 'exact', people(3000, 2500));
		expect(over.ok === false && over.message).toBe('$5.00 too much.');
	});

	it('splits by percent without losing a cent', () => {
		const result = computeShares(1000, 'percent', people(33.33, 33.33, 33.34));
		expect(result.ok).toBe(true);
		expect(owed(result).reduce((a, b) => a + b, 0)).toBe(1000);
	});

	it('refuses percentages that do not make 100', () => {
		const result = computeShares(1000, 'percent', people(60, 30));
		expect(result.ok === false && result.message).toBe('10% left to assign.');
	});

	it('needs an amount and at least one person', () => {
		expect(computeShares(0, 'equal', people(0)).ok).toBe(false);
		expect(computeShares(1000, 'equal', []).ok).toBe(false);
	});

	it('rejects negative or unreadable inputs', () => {
		expect(computeShares(1000, 'exact', people(-100, 1100)).ok).toBe(false);
		expect(computeShares(1000, 'percent', people(NaN, 100)).ok).toBe(false);
	});
});

describe('readSplitInput', () => {
	it('reads dollars as cents for exact amounts, and plain numbers otherwise', () => {
		expect(readSplitInput('exact', '12.50')).toBe(1250);
		expect(readSplitInput('percent', '40')).toBe(40);
		expect(readSplitInput('exact', '')).toBe(0);
		expect(readSplitInput('exact', 'lots')).toBeNaN();
	});
});
