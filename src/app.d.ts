import type { SupabaseClient } from '@supabase/supabase-js';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			/** Null while Supabase isn't configured: the app runs on sample data. */
			supabase: SupabaseClient | null;
			/** The signed-in person, from their verified session token (see hooks.server.ts). */
			user: { id: string; email: string | null } | null;
			/** True when running on in-memory sample data. */
			sampleMode: boolean;
			/** Where the signed-in person is in sign-up; decides which pages they can open. */
			stage: import('#lib/features/account/stage.js').Stage;
			/** The home the signed-in person belongs to, once they've built or joined one. */
			householdId: string | null;
			/** That home's time zone and currency (src/lib/home.ts); the defaults before one. */
			home: import('#lib/home.js').HomeSettings;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				/** Cloudflare's rate limiter for AI calls (wrangler.jsonc › ratelimits). */
				AI_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
			};
		}
	}
}

export {};
