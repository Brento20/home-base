/**
 * What a photo on a post or a postcard may be. The browser shrinks photos before they're sent
 * (src/lib/ui/photo.ts), so these limits are generous; the storage buckets enforce the same.
 */
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const photoExtension = (type: string) =>
	type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';

/** A problem with a chosen photo, or null when it's fine. */
export function photoProblem(photo: File | null) {
	if (!photo) return null;
	if (!PHOTO_TYPES.includes(photo.type)) return 'That photo type isn’t supported.';
	if (photo.size > PHOTO_MAX_BYTES) return 'That photo is too big.';
	return null;
}

/** For sample mode, which keeps photos in memory as data URLs. */
export function toBase64(bytes: Uint8Array) {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}
