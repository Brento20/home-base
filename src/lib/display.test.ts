import { describe, expect, it } from 'vitest';
import { DEFAULT_DISPLAY, parseDisplay } from './display.js';

describe('display preferences', () => {
	it('starts as designed when nothing is saved', () => {
		expect(parseDisplay(null)).toEqual(DEFAULT_DISPLAY);
		expect(parseDisplay({})).toEqual(DEFAULT_DISPLAY);
	});

	it('keeps what it recognises and defaults the rest', () => {
		expect(
			parseDisplay({ reduceGlow: true, todayCardLimit: 3, todayCardLayout: 'list', extra: 1 })
		).toEqual({ ...DEFAULT_DISPLAY, reduceGlow: true, todayCardLimit: 3, todayCardLayout: 'list' });
	});

	it('ignores values it does not know', () => {
		expect(parseDisplay({ reduceGlow: 'yes', todayCardLimit: 4, todayCardLayout: 'grid' })).toEqual(
			DEFAULT_DISPLAY
		);
	});
});
