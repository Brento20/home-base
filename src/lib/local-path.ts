/**
 * Whether a `next` or `then` address from a link is a page on this site, safe to send someone
 * to after signing in or deleting something. "//evil.com" and "/\evil.com" (which browsers read
 * as "//evil.com") go elsewhere, as does anything with control characters or spaces.
 */
export function isLocalPath(value: string | null | undefined): value is string {
	return (
		typeof value === 'string' &&
		value.startsWith('/') &&
		value[1] !== '/' &&
		value[1] !== '\\' &&
		![...value].some(
			(char) => char.trim() === '' || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127
		)
	);
}
