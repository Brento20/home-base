import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestTiming } from './timing.js';

describe('request timing', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('counts database calls and times overlapping ones once', async () => {
		vi.stubGlobal(
			'fetch',
			() => new Promise<Response>((done) => setTimeout(() => done(new Response('ok')), 30))
		);
		const timing = new RequestTiming();
		await timing.span('profile', () => timing.fetch('https://db/one'));
		await Promise.all([timing.fetch('https://db/two'), timing.fetch('https://db/three')]);

		const header = timing.header();
		expect(header).toMatch(/^profile;dur=\d+\.\d, db;desc="3 calls";dur=\d+\.\d, total;dur=/);
		const db = Number(/db;desc="3 calls";dur=([\d.]+)/.exec(header)![1]);
		expect(db).toBeGreaterThanOrEqual(55);
		expect(db).toBeLessThan(90); // two rounds of 30ms, not three
	});
});
