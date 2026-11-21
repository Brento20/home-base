import { afterEach, describe, expect, it } from 'vitest';
import { currencySymbol, formatMoney, parseMoney } from '#lib/features/expenses/money.js';
import { DEFAULT_HOME, homeFrom, isTimeZone, setHomeSettings } from './home.js';
import { todayISO, zonedToInstant } from './time.js';

afterEach(() => setHomeSettings(DEFAULT_HOME));

describe('a home somewhere else', () => {
	it('works out "today" in the home’s own time zone', () => {
		const instant = new Date('2026-11-20T14:00:00Z');
		expect(todayISO(instant)).toBe('2026-11-21'); // Sydney: already tomorrow
		setHomeSettings({ timeZone: 'Europe/London', currency: 'GBP' });
		expect(todayISO(instant)).toBe('2026-11-20'); // London: still the 20th
		expect(zonedToInstant('2026-07-01', '07:00').toISOString()).toBe('2026-07-01T06:00:00.000Z');
	});

	it('shows money in the home’s currency', () => {
		expect(formatMoney(123450)).toBe('$1,234.50');
		setHomeSettings({ timeZone: 'Europe/London', currency: 'GBP' });
		expect(formatMoney(123450)).toBe('£1,234.50');
		expect(currencySymbol()).toBe('£');
	});

	it('reads typed amounts whatever the sign', () => {
		expect(parseMoney('£12.05')).toBe(1205);
		expect(parseMoney('NZ$1,234.5')).toBe(123450);
		expect(parseMoney('lots')).toBeNull();
	});
});

describe('reading a home’s row', () => {
	it('falls back to Sydney and AUD for anything missing or unknown', () => {
		expect(homeFrom(null)).toEqual(DEFAULT_HOME);
		expect(homeFrom({ time_zone: 'Mars/Olympus', currency: 'XYZ' })).toEqual(DEFAULT_HOME);
		expect(homeFrom({ time_zone: 'Pacific/Auckland', currency: 'NZD' })).toEqual({
			timeZone: 'Pacific/Auckland',
			currency: 'NZD'
		});
	});

	it('knows a real time zone from a made-up one', () => {
		expect(isTimeZone('America/New_York')).toBe(true);
		expect(isTimeZone('Nowhere/Special')).toBe(false);
	});
});
