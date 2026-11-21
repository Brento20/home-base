/**
 * Sealing text so the database holds only ciphertext: AES-256-GCM with a key that lives in the
 * Worker's secrets (NOTES_KEY), never in the database. Someone with the database alone (a
 * leaked backup, a stolen dashboard login) sees "enc:v1:…" instead of the Wi-Fi password.
 *
 * Each sealed value is bound to a context string (the home's id), so ciphertext copied into
 * another home won't open there. The format is versioned so the scheme can change later:
 *
 *   enc:v1:<base64url of 12-byte IV ‖ ciphertext ‖ 16-byte tag>
 */

const PREFIX = 'enc:v1:';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const isSealed = (text: string) => text.startsWith(PREFIX);

const toBase64Url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
	const plain = text.replaceAll('-', '+').replaceAll('_', '/');
	return Uint8Array.from(atob(plain), (char) => char.charCodeAt(0));
}

const keys = new Map<string, Promise<CryptoKey>>();

/** The AES key from its base64 form. Null (and a log line) if it isn't 32 bytes. */
export function sealingKey(secret: string | undefined): Promise<CryptoKey> | null {
	if (!secret) return null;
	let key = keys.get(secret);
	if (!key) {
		let raw: Uint8Array<ArrayBuffer>;
		try {
			raw = fromBase64(secret.trim());
		} catch {
			raw = new Uint8Array();
		}
		if (raw.length !== 32) {
			console.error('[sealed] NOTES_KEY must be 32 bytes, base64 (openssl rand -base64 32).');
			return null;
		}
		key = crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
		keys.set(secret, key);
	}
	return key;
}

export async function seal(text: string, key: Promise<CryptoKey>, context: string) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const sealed = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv, additionalData: encoder.encode(context) },
		await key,
		encoder.encode(text)
	);
	const out = new Uint8Array(iv.length + sealed.byteLength);
	out.set(iv);
	out.set(new Uint8Array(sealed), iv.length);
	return PREFIX + toBase64Url(out);
}

/** The text back, or null when it can't be opened (another key, another home, tampered). */
export async function unseal(sealed: string, key: Promise<CryptoKey>, context: string) {
	if (!isSealed(sealed)) return sealed;
	try {
		const bytes = fromBase64(sealed.slice(PREFIX.length));
		const plain = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: encoder.encode(context) },
			await key,
			bytes.slice(12)
		);
		return decoder.decode(plain);
	} catch {
		return null;
	}
}
