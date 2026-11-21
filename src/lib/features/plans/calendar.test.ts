import { describe, expect, it } from 'vitest';
import { gridRange, monthFromParam, monthGrid, shiftMonth } from './calendar.js';

describe('calendar', () => {
	it('shifts months across years', () => {
		expect(shiftMonth('2026-11', 2)).toBe('2027-01');
		expect(shiftMonth('2026-01', -1)).toBe('2025-12');
	});

	it('lays out six Monday-first weeks', () => {
		const weeks = monthGrid('2026-11');
		expect(weeks).toHaveLength(6);
		expect(weeks[0][0].date).toBe('2026-10-26'); // the Monday before 1 November
		expect(new Date(`${weeks[0][0].date}T00:00:00Z`).getUTCDay()).toBe(1);
		expect(weeks.flat().filter((day) => day.inMonth)).toHaveLength(30);
	});

	it('covers the grid with a half-open range', () => {
		expect(gridRange('2026-11')).toEqual({ from: '2026-10-26', until: '2026-12-07' });
	});

	it('falls back to this month for a bad ?month=', () => {
		expect(monthFromParam('2026-13', '2026-11-20')).toBe('2026-11');
		expect(monthFromParam('2027-02', '2026-11-20')).toBe('2027-02');
	});
});
