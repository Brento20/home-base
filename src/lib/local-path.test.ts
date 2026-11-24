import { describe, expect, it } from 'vitest';
import { isLocalPath } from './local-path.js';

describe('a link back into the app', () => {
	it('allows pages on this site', () => {
		expect(isLocalPath('/')).toBe(true);
		expect(isLocalPath('/plans/123?view=list#top')).toBe(true);
	});

	it('refuses anything that leaves it', () => {
		for (const bad of [
			'//evil.com',
			'/\\evil.com',
			'https://evil.com',
			'evil.com',
			'/\tevil',
			'',
			null
		])
			expect(isLocalPath(bad)).toBe(false);
	});
});
