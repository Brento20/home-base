import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestTiming } from './timing.js';

describe('request timing', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('counts database calls and times overlapping ones once', async () => {
		// A fake clock, so a busy machine can't stretch the timings.
		vi.useFakeTimers({ toFake: ['setTimeout', 'performance'] });
		try {
			vi.stubGlobal(
				'fetch',
				() => new Promise<Response>((done) => setTimeout(() => done(new Response('ok')), 30))
			);
			const timing = new RequestTiming();
			const first = timing.span('profile', () => timing.fetch('https://db/one'));
			await vi.advanceTimersByTimeAsync(30);
			await first;
			const both = Promise.all([timing.fetch('https://db/two'), timing.fetch('https://db/three')]);
			await vi.advanceTimersByTimeAsync(30);
			await both;

			const header = timing.header();
			expect(header).toMatch(/^profile;dur=\d+\.\d, db;desc="3 calls";dur=\d+\.\d, total;dur=/);
			const db = Number(/db;desc="3 calls";dur=([\d.]+)/.exec(header)![1]);
			expect(db).toBe(60); // two rounds of 30ms, not three
		} finally {
			vi.useRealTimers();
		}
	});
});
