/**
 * Where a request's time goes, sent back as a Server-Timing header (Safari's Web Inspector shows
 * it under Network › Timing; so does `curl -I`). Spans for the sign-in check and the profile
 * lookup, plus every database call the request makes: how many, and how long at least one was
 * in flight (calls running side by side count once). On Workers the clock only moves across
 * I/O, which is exactly what this measures.
 */
export class RequestTiming {
	private readonly started = performance.now();
	private readonly spans: [string, number][] = [];
	private calls = 0;
	private inFlight = 0;
	private busySince = 0;
	private busy = 0;

	async span<T>(name: string, work: () => Promise<T>): Promise<T> {
		const start = performance.now();
		try {
			return await work();
		} finally {
			this.spans.push([name, performance.now() - start]);
		}
	}

	/** A fetch for the Supabase client that counts and times each call. */
	readonly fetch: typeof fetch = async (input, init) => {
		this.calls += 1;
		if (this.inFlight++ === 0) this.busySince = performance.now();
		try {
			return await fetch(input, init);
		} finally {
			if (--this.inFlight === 0) this.busy += performance.now() - this.busySince;
		}
	};

	header() {
		const ms = (value: number) => value.toFixed(1);
		return [
			...this.spans.map(([name, duration]) => `${name};dur=${ms(duration)}`),
			`db;desc="${this.calls} calls";dur=${ms(this.busy)}`,
			`total;dur=${ms(performance.now() - this.started)}`
		].join(', ');
	}
}
