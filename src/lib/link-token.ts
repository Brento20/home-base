/**
 * The tokens in invite, friend and house-sitter links. The database makes them: 24 random bytes,
 * URL-safe base64, 32 characters, and keeps only a hash. Anything that isn't shaped like one is
 * refused before it reaches the database.
 */
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

export const isLinkToken = (value: string) => TOKEN.test(value);

/** A token shaped like the database's, for sample mode (no database). */
export function sampleLinkToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	return btoa(String.fromCharCode(...bytes))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');
}
