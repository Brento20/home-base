import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => (value ? value : undefined);

/**
 * Both are optional. Leave them unset and the app runs on in-memory sample data,
 * so the visual shell works before a Supabase project exists.
 */
export const variables = defineEnvVars({
	SUPABASE_URL: {
		description: 'Project URL from Supabase › Project Settings › API',
		schema: optional
	},
	SUPABASE_PUBLISHABLE_KEY: {
		description: 'Publishable (anon) key from Supabase › Project Settings › API keys',
		schema: optional
	}
});
