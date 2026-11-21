import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '$app/env/private';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/**
 * One client per request, reading and writing the auth session through SvelteKit cookies.
 * `fetch` lets the request time its database calls (src/lib/server/timing.ts).
 */
export function createSupabaseServerClient(event: RequestEvent, timedFetch?: typeof fetch) {
	return createServerClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
		global: timedFetch ? { fetch: timedFetch } : undefined,
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet, headers) => {
				for (const { name, value, options } of cookiesToSet) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
				try {
					event.setHeaders(headers);
				} catch {
					// Headers were already set for this response; the cookies above still apply.
				}
			}
		}
	});
}
