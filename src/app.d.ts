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
			/**
			 * That home with everyone in it, read with the profile on page loads (not form actions,
			 * which may change it). getHousehold() uses it, or asks the database when it's null.
			 */
			household: {
				household: import('#lib/types.js').Household;
				me: import('#lib/types.js').Profile;
			} | null;
			/** That home's time zone and currency (src/lib/home.ts); the defaults before one. */
			home: import('#lib/home.js').HomeSettings;
			/** The signed-in person's display preferences (src/lib/display.ts); the defaults otherwise. */
			display: import('#lib/display.js').DisplayPrefs;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// The Worker's bindings (the AI rate limiter) come from 'cloudflare:workers'
		// (src/lib/server/background.ts): the adapter doesn't pass `platform` here.
	}
}

export {};
