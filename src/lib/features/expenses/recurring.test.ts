import { describe, expect, it } from 'vitest';
import { nextRecurringDate } from './recurring.js';

describe('recurring bill dates', () => {
	it('keeps a monthly bill on its day, or the month’s last', () => {
		expect(nextRecurringDate('2026-01-31', 'monthly', 1)).toBe('2026-02-28');
		expect(nextRecurringDate('2026-01-31', 'monthly', 2)).toBe('2026-03-31');
		expect(nextRecurringDate('2026-01-31', 'monthly', 10)).toBe('2026-11-30');
		expect(nextRecurringDate('2028-01-31', 'monthly', 1)).toBe('2028-02-29');
	});

	it('counts weeks, fortnights, quarters and years', () => {
		expect(nextRecurringDate('2026-11-25', 'weekly', 2)).toBe('2026-12-09');
		expect(nextRecurringDate('2026-11-25', 'fortnightly', 1)).toBe('2026-12-09');
		expect(nextRecurringDate('2026-11-30', 'quarterly', 1)).toBe('2027-02-28');
		expect(nextRecurringDate('2024-02-29', 'yearly', 1)).toBe('2025-02-28');
	});
});
