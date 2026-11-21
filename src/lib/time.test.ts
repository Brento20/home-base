import { describe, expect, it } from 'vitest';
import {
	addDays,
	daysBetween,
	formatDueLabel,
	isValidDateISO,
	todayISO,
	zonedToInstant
} from './time.js';

describe('dates in the household time zone (Sydney by default)', () => {
	it('adds days across months, years and daylight saving', () => {
		expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2026-10-04', 1)).toBe('2026-10-05'); // Sydney's clocks go forward this day
	});

	it('counts the days between', () => {
		expect(daysBetween('2026-11-01', '2026-11-30')).toBe(29);
	});

	it('knows the date in Sydney, not UTC', () => {
		// 2pm UTC on the 20th is 1am on the 21st in Sydney (UTC+11 in summer).
		expect(todayISO(new Date('2026-11-20T14:00:00Z'))).toBe('2026-11-21');
	});

	it('turns a Sydney wall-clock time into the right instant', () => {
		expect(zonedToInstant('2026-11-21', '07:00').toISOString()).toBe('2026-11-20T20:00:00.000Z');
		expect(zonedToInstant('2026-07-01', '07:00').toISOString()).toBe('2026-06-30T21:00:00.000Z');
	});

	it('checks dates are real', () => {
		expect(isValidDateISO('2026-02-29')).toBe(false);
		expect(isValidDateISO('2028-02-29')).toBe(true);
	});

	it('labels due dates relative to today', () => {
		expect(formatDueLabel('2026-11-20', '2026-11-20')).toBe('Today');
		expect(formatDueLabel('2026-11-21', '2026-11-20')).toBe('Tomorrow');
	});
});
