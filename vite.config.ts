import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Hosted on Cloudflare Workers; wrangler.jsonc holds the deploy settings.
			adapter: adapter(),

			/*
			 * Content Security Policy: only this app's own scripts run, each page with a fresh
			 * nonce (SvelteKit adds it to its own scripts; app.html's inline scripts carry
			 * %sveltekit.nonce%). Styles allow inline, for Svelte's style: directives. Supabase and
			 * Claude are only ever called from the server, so the page talks to itself alone.
			 */
			csp: {
				mode: 'nonce',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', 'blob:'],
					'font-src': ['self', 'data:'],
					'connect-src': ['self'],
					'manifest-src': ['self'],
					'worker-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none'],
					'upgrade-insecure-requests': true
				}
			}
		})
	],
	// Unit tests sit beside the code they test (`*.test.ts`); the end-to-end walk is in e2e/.
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
