import { describe, expect, it, vi } from 'vitest';
import { isSealed, seal, sealingKey, unseal } from './sealed.js';

const secret = btoa(String.fromCharCode(...new Uint8Array(32).map((_, index) => index * 7)));
const other = btoa(String.fromCharCode(...new Uint8Array(32).fill(9)));

describe('sealed text', () => {
	it('seals and opens again, never the same twice', async () => {
		const key = sealingKey(secret)!;
		const first = await seal('Wi-Fi: Hunter2 ✓', key, 'home-a');
		const second = await seal('Wi-Fi: Hunter2 ✓', key, 'home-a');
		expect(isSealed(first)).toBe(true);
		expect(first).not.toContain('Hunter2');
		expect(first).not.toBe(second);
		expect(await unseal(first, key, 'home-a')).toBe('Wi-Fi: Hunter2 ✓');
	});

	it('won’t open with another key, in another home, or after tampering', async () => {
		const key = sealingKey(secret)!;
		const sealed = await seal('door code 4512', key, 'home-a');
		expect(await unseal(sealed, sealingKey(other)!, 'home-a')).toBeNull();
		expect(await unseal(sealed, key, 'home-b')).toBeNull();
		const flipped = sealed.slice(0, -3) + (sealed.at(-3) === 'A' ? 'B' : 'A') + sealed.slice(-2);
		expect(await unseal(flipped, key, 'home-a')).toBeNull();
	});

	it('passes plain text through, so old notes still read', async () => {
		expect(await unseal('just text', sealingKey(secret)!, 'home-a')).toBe('just text');
	});

	it('refuses a key that isn’t 32 bytes', () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(sealingKey(undefined)).toBeNull();
		expect(sealingKey('too-short')).toBeNull();
		expect(sealingKey(btoa('x'.repeat(16)))).toBeNull();
		log.mockRestore();
	});

	it('fits a full-length note inside the column’s sealed limit', async () => {
		const sealed = await seal('é'.repeat(2000), sealingKey(secret)!, 'home-a');
		expect(sealed.length).toBeLessThanOrEqual(12000);
	});
});
