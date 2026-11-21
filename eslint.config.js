import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

/**
 * Lint rules: the recommended sets for JavaScript, TypeScript and Svelte. Formatting is
 * Prettier's job (prettier.config.js); this catches unused code and Svelte mistakes.
 */
export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } }
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'] }
		}
	},
	{
		rules: {
			// TypeScript already reports undefined names, and knows about the ambient types.
			'no-undef': 'off',
			// Unused on purpose? Start the name with an underscore.
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			// Links are plain paths; the app doesn't use a base path that resolve() would add.
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		ignores: [
			'.svelte-kit/',
			'.wrangler/',
			'_to_delete/',
			'build/',
			'node_modules/',
			'static/',
			'test-results/',
			'playwright-report/'
		]
	}
);
