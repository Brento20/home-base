import { describe, expect, it, vi } from 'vitest';
import {
	encryptForPush,
	fromBase64Url,
	sendPush,
	toBase64Url,
	vapidAuthorization
} from './web-push.js';

// RFC 8291 §5 and Appendix A: the worked example, byte for byte.
const RFC = {
	plaintext: 'V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24',
	senderPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
	senderPublic:
		'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
	phonePublic:
		'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
	salt: 'DGv6ra1nlYgDCS1FRnbzlw',
	auth: 'BTBZMqHH6r4Tts7J_aSIgg',
	body:
		'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml' +
		'mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT' +
		'pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN'
};

// A throwaway VAPID pair for the signing tests.
async function vapidPair() {
	const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign',
		'verify'
	])) as CryptoKeyPair;
	const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
	const publicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
	return {
		keys: {
			publicKey: toBase64Url(publicRaw),
			privateKey: jwk.d!,
			subject: 'mailto:test@example.com'
		},
		verifier: pair.publicKey
	};
}

describe('web push encryption', () => {
	it('matches RFC 8291’s worked example exactly', async () => {
		const body = await encryptForPush(
			fromBase64Url(RFC.plaintext),
			{ p256dh: RFC.phonePublic, auth: RFC.auth },
			{
				salt: fromBase64Url(RFC.salt),
				senderPublic: fromBase64Url(RFC.senderPublic),
				senderPrivate: fromBase64Url(RFC.senderPrivate)
			}
		);
		expect(toBase64Url(body)).toBe(RFC.body);
	});

	it('uses a fresh key and salt every time', async () => {
		const target = { p256dh: RFC.phonePublic, auth: RFC.auth };
		const message = new TextEncoder().encode('hello');
		const one = await encryptForPush(message, target);
		const two = await encryptForPush(message, target);
		expect(toBase64Url(one)).not.toBe(toBase64Url(two));
		// Header (16 salt + 4 size + 1 length + 65 key) and the message, its end marker and the tag.
		expect(one.length).toBe(86 + 5 + 1 + 16);
	});
});

describe('VAPID', () => {
	it('signs a JWT for the push service’s origin that the public key verifies', async () => {
		const { keys, verifier } = await vapidPair();
		const now = Date.UTC(2026, 11, 1);
		const header = await vapidAuthorization('https://web.push.apple.com/abc123', keys, now);
		const [, token, key] = header.match(/^vapid t=([^,]+), k=(.+)$/)!;
		expect(key).toBe(keys.publicKey);
		const [head, claims, signature] = token.split('.');
		expect(JSON.parse(new TextDecoder().decode(fromBase64Url(claims)))).toEqual({
			aud: 'https://web.push.apple.com',
			exp: now / 1000 + 12 * 3600,
			sub: 'mailto:test@example.com'
		});
		const valid = await crypto.subtle.verify(
			{ name: 'ECDSA', hash: 'SHA-256' },
			verifier,
			fromBase64Url(signature),
			new TextEncoder().encode(`${head}.${claims}`)
		);
		expect(valid).toBe(true);
	});

	it('posts the sealed message with the headers push services expect', async () => {
		const { keys } = await vapidPair();
		const send = vi.fn(async () => new Response(null, { status: 201 }));
		const status = await sendPush(
			{
				endpoint: 'https://fcm.googleapis.com/fcm/send/xyz',
				p256dh: RFC.phonePublic,
				auth: RFC.auth
			},
			{ title: 'Hi' },
			keys,
			{ ttl: 60, urgency: 'high' },
			send as unknown as typeof fetch
		);
		expect(status).toBe(201);
		const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://fcm.googleapis.com/fcm/send/xyz');
		const headers = init.headers as Record<string, string>;
		expect(headers['Content-Encoding']).toBe('aes128gcm');
		expect(headers.TTL).toBe('60');
		expect(headers.Urgency).toBe('high');
		expect(headers.Authorization).toMatch(/^vapid t=.+, k=/);
	});
});
