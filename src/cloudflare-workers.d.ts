// The two parts of Cloudflare's Workers module this app uses (src/lib/server/background.ts).
// The full @cloudflare/workers-types would clash with the browser types the rest of src uses.
declare module 'cloudflare:workers' {
	/** The Worker's bindings: variables, secrets, the AI rate limiter. */
	export const env: Record<string, unknown>;
	/** Keeps the Worker alive until `promise` settles, after the response has gone. */
	export function waitUntil(promise: Promise<unknown>): void;
}
