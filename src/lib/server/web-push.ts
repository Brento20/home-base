/**
 * Sending a web push, with nothing but the Worker's WebCrypto: the message sealed for one phone
 * (RFC 8291, "aes128gcm" content coding from RFC 8188) and signed as from this app (VAPID,
 * RFC 8292). Checked against RFC 8291's own worked example (web-push.test.ts).
 *
 * Keys: the app's VAPID pair is two base64url strings, the public key (65 bytes, uncompressed
 * P-256) and the private key (its 32-byte "d"). `npm run push:keys` makes a pair
 * (tools/vapid-keys.mjs).
 */

export interface PushTarget {
	endpoint: string;
	/** The phone's public key, base64url (65 bytes). */
	p256dh: string;
	/** The phone's auth secret, base64url (16 bytes). */
	auth: string;
}

export interface VapidKeys {
	publicKey: string;
	privateKey: string;
	/** Who to contact about this app's pushes: "mailto:…" or an https URL. */
	subject: string;
}

export interface PushOptions {
	/** Seconds the push service may hold it for a phone that's off. */
	ttl?: number;
	urgency?: 'very-low' | 'low' | 'normal' | 'high';
}

const encoder = new TextEncoder();

export function toBase64Url(bytes: Uint8Array): string {
	let text = '';
	for (const byte of bytes) text += String.fromCharCode(byte);
	return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
	const padded = value.replace(/-/g, '+').replace(/_/g, '/');
	const text = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
	const bytes = new Uint8Array(text.length);
	for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i);
	return bytes;
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
	let at = 0;
	for (const part of parts) {
		out.set(part, at);
		at += part.length;
	}
	return out;
}

/** A P-256 private key from its raw "d" and public point, for ECDH or ECDSA. */
async function importPrivate(d: Uint8Array, publicRaw: Uint8Array, use: 'ECDH' | 'ECDSA') {
	const jwk: JsonWebKey = {
		kty: 'EC',
		crv: 'P-256',
		d: toBase64Url(d),
		x: toBase64Url(publicRaw.slice(1, 33)),
		y: toBase64Url(publicRaw.slice(33, 65)),
		ext: true
	};
	return crypto.subtle.importKey(
		'jwk',
		jwk,
		{ name: use, namedCurve: 'P-256' },
		false,
		use === 'ECDH' ? ['deriveBits'] : ['sign']
	);
}

/** HKDF-SHA-256, extract and expand in one. */
async function hkdf(salt: Uint8Array, input: Uint8Array, info: Uint8Array, bytes: number) {
	const key = await crypto.subtle.importKey('raw', input as BufferSource, 'HKDF', false, [
		'deriveBits'
	]);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource },
		key,
		bytes * 8
	);
	return new Uint8Array(bits);
}

/** Fixed sender keys and salt, only for checking against the RFC's worked example. */
export interface FixedForTest {
	salt: Uint8Array;
	senderPublic: Uint8Array;
	senderPrivate: Uint8Array;
}

/**
 * Seals a message for one phone (RFC 8291 §3): a fresh key pair agrees a secret with the
 * phone's key, mixed with its auth secret, then a random salt derives the key and nonce for
 * one AES-GCM record. The result is the whole request body, header included.
 */
export async function encryptForPush(
	message: Uint8Array,
	target: Pick<PushTarget, 'p256dh' | 'auth'>,
	fixed?: FixedForTest
): Promise<Uint8Array<ArrayBuffer>> {
	const phonePublic = fromBase64Url(target.p256dh);
	const authSecret = fromBase64Url(target.auth);
	const phoneKey = await crypto.subtle.importKey(
		'raw',
		phonePublic,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[]
	);

	let senderPublic: Uint8Array;
	let senderPrivate: CryptoKey;
	if (fixed) {
		senderPublic = fixed.senderPublic;
		senderPrivate = await importPrivate(fixed.senderPrivate, fixed.senderPublic, 'ECDH');
	} else {
		const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
			'deriveBits'
		])) as CryptoKeyPair;
		senderPrivate = pair.privateKey;
		senderPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
	}
	const salt = fixed?.salt ?? crypto.getRandomValues(new Uint8Array(16));

	const shared = new Uint8Array(
		await crypto.subtle.deriveBits({ name: 'ECDH', public: phoneKey }, senderPrivate, 256)
	);
	const keyInfo = concat(encoder.encode('WebPush: info\0'), phonePublic, senderPublic);
	const ikm = await hkdf(authSecret, shared, keyInfo, 32);
	const contentKey = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
	const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);

	// One record: the message, then 0x02 to say it's the last.
	const record = concat(message, new Uint8Array([2]));
	const aes = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);
	const sealed = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aes, record)
	);

	// Header (RFC 8188 §2.1): salt, record size (4096), key id length, the sender's public key.
	const header = concat(salt, new Uint8Array([0, 0, 16, 0, senderPublic.length]), senderPublic);
	return concat(header, sealed);
}

/** The VAPID Authorization header for a push service: a JWT signed with the app's key. */
export async function vapidAuthorization(
	endpoint: string,
	keys: VapidKeys,
	now = Date.now()
): Promise<string> {
	const publicRaw = fromBase64Url(keys.publicKey);
	const signer = await importPrivate(fromBase64Url(keys.privateKey), publicRaw, 'ECDSA');
	const part = (value: object) => toBase64Url(encoder.encode(JSON.stringify(value)));
	const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({
		aud: new URL(endpoint).origin,
		exp: Math.floor(now / 1000) + 12 * 60 * 60,
		sub: keys.subject
	})}`;
	const signature = new Uint8Array(
		await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signer, encoder.encode(unsigned))
	);
	return `vapid t=${unsigned}.${toBase64Url(signature)}, k=${keys.publicKey}`;
}

/**
 * Sends one push. Returns the push service's status: 201 sent, 404 or 410 the subscription is
 * gone (the phone turned notifications off, or the app was removed), 429 slow down.
 */
export async function sendPush(
	target: PushTarget,
	payload: unknown,
	keys: VapidKeys,
	options: PushOptions = {},
	send: typeof fetch = fetch
): Promise<number> {
	const body = await encryptForPush(encoder.encode(JSON.stringify(payload)), target);
	const response = await send(target.endpoint, {
		method: 'POST',
		headers: {
			Authorization: await vapidAuthorization(target.endpoint, keys),
			'Content-Encoding': 'aes128gcm',
			'Content-Type': 'application/octet-stream',
			TTL: String(options.ttl ?? 60 * 60 * 24),
			Urgency: options.urgency ?? 'normal'
		},
		body
	});
	return response.status;
}
