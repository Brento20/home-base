/**
 * Work that shouldn't hold a page up: it runs after the response has gone, and the Worker is
 * kept alive until it's done (Cloudflare's waitUntil). In dev and tests it just runs.
 * Failures are logged, never thrown: nobody's waiting on the answer.
 */
import { env, waitUntil } from 'cloudflare:workers';

export function background(label: string, work: Promise<unknown>) {
	const logged = work.catch((problem) => {
		console.error(`[background] ${label}:`, problem instanceof Error ? problem.message : problem);
	});
	try {
		waitUntil(logged);
	} catch {
		// Outside a Worker request (a test): the promise carries on by itself.
	}
}

interface RateLimiter {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Cloudflare's rate limiter for AI calls (wrangler.jsonc › ratelimits), or undefined in dev.
 * Read from the Worker's bindings: the adapter doesn't pass `platform` to SvelteKit here, so
 * `event.platform.env` is always empty.
 */
export function aiLimiter(): RateLimiter | undefined {
	try {
		return (env as unknown as { AI_LIMITER?: RateLimiter } | undefined)?.AI_LIMITER;
	} catch {
		return undefined; // Prerendering, or a test without the Workers module.
	}
}
