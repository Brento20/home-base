import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => (value ? value : undefined);

/**
 * All optional. Leave the Supabase pair unset and the app runs on in-memory sample data, so the
 * visual shell works before a Supabase project exists. Leave the Anthropic key unset and the AI
 * helpers (recipe import, quick add, receipt scan, the weekly line on Today) simply don't show.
 */
export const variables = defineEnvVars({
	SUPABASE_URL: {
		description: 'Project URL from Supabase › Project Settings › API',
		schema: optional
	},
	SUPABASE_PUBLISHABLE_KEY: {
		description: 'Publishable (anon) key from Supabase › Project Settings › API keys',
		schema: optional
	},
	ANTHROPIC_API_KEY: {
		description:
			'Claude API key from platform.claude.com › API keys. Optional: without it, the AI helpers hide and every form works by hand.',
		schema: optional
	},
	ANTHROPIC_BASE_URL: {
		description: 'Only for tests: points the AI helpers at a stand-in server.',
		schema: optional
	}
});
