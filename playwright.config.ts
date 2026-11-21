import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end journeys at phone size, in sample mode (no real database). Sample data lives in
 * memory and is shared, so the journeys run one at a time.
 *
 * By default against the dev server. With E2E_WORKER=1 (as CI does, after `vite build`), against
 * the real Cloudflare Worker build in wrangler, which catches what Node lets slide but Workers
 * refuse (such as making random ids while a module loads).
 */
const worker = Boolean(process.env.E2E_WORKER);
const port = worker ? 8787 : 5173;

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://127.0.0.1:${port}`,
		...devices['iPhone 15'],
		browserName: 'chromium',
		trace: 'retain-on-failure'
	},
	webServer: {
		command: worker
			? 'npx wrangler dev --port 8787 --ip 127.0.0.1'
			: 'npx vite dev --port 5173 --host 127.0.0.1',
		url: `http://127.0.0.1:${port}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		// Sample mode: no Supabase or Claude keys, whatever the shell has set.
		env: {
			SUPABASE_URL: '',
			SUPABASE_PUBLISHABLE_KEY: '',
			ANTHROPIC_API_KEY: '',
			WRANGLER_SEND_METRICS: 'false'
		}
	}
});
