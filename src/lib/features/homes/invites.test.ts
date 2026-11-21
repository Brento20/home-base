import { describe, expect, it } from 'vitest';
import { inviteLink, isInviteToken, placesLeft, tokenFromInvite } from './invites.js';

const token = 'Ab3_-xY9Ab3_-xY9Ab3_-xY9Ab3_-xY9';

describe('invite links', () => {
	it('knows a token when it sees one', () => {
		expect(isInviteToken(token)).toBe(true);
		expect(isInviteToken('short')).toBe(false);
		expect(isInviteToken(`${token}/../x`)).toBe(false);
		expect(isInviteToken("x' or 1=1 --aaaaaaaaaaaaaaaaaa")).toBe(false);
	});

	it('finds the token in whatever was pasted', () => {
		expect(tokenFromInvite(token)).toBe(token);
		expect(tokenFromInvite(`  ${token}\n`)).toBe(token);
		expect(tokenFromInvite(`https://home-base.example.dev/join/${token}`)).toBe(token);
		expect(tokenFromInvite(`Join us! https://x.dev/join/${token}?utm=1`)).toBe(token);
		expect(tokenFromInvite('/join/abc')).toBeNull();
		expect(tokenFromInvite('https://example.com')).toBeNull();
		expect(tokenFromInvite('')).toBeNull();
	});

	it('builds the link from the site it was made on', () => {
		expect(inviteLink('https://a.dev', token)).toBe(`https://a.dev/join/${token}`);
	});

	it('says how many more people a link lets in', () => {
		expect(placesLeft(0, 1)).toBe('Works for 1 more person');
		expect(placesLeft(2, 5)).toBe('Works for 3 more people');
		expect(placesLeft(9, 5)).toBe('Works for 0 more people');
	});
});
