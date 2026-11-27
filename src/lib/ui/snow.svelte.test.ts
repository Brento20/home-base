import { describe, expect, it } from 'vitest';
import { isSnowSeason } from './snow.svelte.js';

describe('isSnowSeason', () => {
	it('snows from 27 November to Christmas Day, both included', () => {
		expect(isSnowSeason('2026-11-26')).toBe(false);
		expect(isSnowSeason('2026-11-27')).toBe(true);
		expect(isSnowSeason('2026-12-01')).toBe(true);
		expect(isSnowSeason('2026-12-25')).toBe(true);
		expect(isSnowSeason('2026-12-26')).toBe(false);
		expect(isSnowSeason('2027-01-03')).toBe(false);
	});

	it('comes back every year', () => {
		expect(isSnowSeason('2027-11-30')).toBe(true);
	});
});
