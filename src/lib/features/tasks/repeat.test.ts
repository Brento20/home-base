import { describe, expect, it } from 'vitest';
import {
	describeRepeat,
	nextDueDate,
	nextOccurrence,
	repeatFor,
	repeatFromForm,
	ruleOf
} from './repeat.js';

describe('repeat rules', () => {
	it('reads presets and custom repeats', () => {
		expect(ruleOf('weekly')).toEqual({ every: 1, unit: 'weeks' });
		expect(ruleOf('fortnightly')).toEqual({ every: 2, unit: 'weeks' });
		expect(ruleOf('every-3-days')).toEqual({ every: 3, unit: 'days' });
		expect(ruleOf('none')).toBeNull();
	});

	it('names a custom repeat by its preset when there is one', () => {
		expect(repeatFor(1, 'weeks')).toBe('weekly');
		expect(repeatFor(2, 'weeks')).toBe('fortnightly');
		expect(repeatFor(10, 'days')).toBe('every-10-days');
	});

	it('reads the form, falling back to no repeat for nonsense', () => {
		const form = (entries: Record<string, string>) => {
			const data = new FormData();
			for (const [key, value] of Object.entries(entries)) data.set(key, value);
			return data;
		};
		expect(repeatFromForm(form({ repeat: 'monthly' }))).toBe('monthly');
		expect(repeatFromForm(form({ repeat: 'nonsense' }))).toBe('none');
	});

	it('says how often in words', () => {
		expect(describeRepeat('none')).toBeNull();
		expect(describeRepeat('weekly')).toBeTruthy();
	});
});

describe('next due dates', () => {
	it('steps days and weeks', () => {
		expect(nextOccurrence('2026-11-20', 'weekly', 20)).toBe('2026-11-27');
		expect(nextOccurrence('2026-11-20', 'every-3-days', 20)).toBe('2026-11-23');
	});

	it('keeps the day of the month, clamping short months (as the database does)', () => {
		expect(nextOccurrence('2026-01-31', 'monthly', 31)).toBe('2026-02-28');
		expect(nextOccurrence('2026-02-28', 'monthly', 31)).toBe('2026-03-31');
		expect(nextOccurrence('2028-02-29', 'every-1-years', 29)).toBe('2029-02-28');
	});

	it('moves past today when a chore was ticked off late', () => {
		expect(nextDueDate('2026-11-01', 'weekly', '2026-11-20')).toBe('2026-11-22');
		expect(nextDueDate(null, 'weekly', '2026-11-20')).toBe('2026-11-27');
	});
});
