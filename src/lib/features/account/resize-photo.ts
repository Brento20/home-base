/**
 * Shrinks a chosen photo in the browser to a 512 px square JPEG before it's uploaded.
 * Re-drawing it also drops the hidden data phones attach, including where it was taken.
 */
const PHOTO_SIZE = 512;

export async function resizePhoto(file: File): Promise<File> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	const side = Math.min(bitmap.width, bitmap.height);
	const canvas = document.createElement('canvas');
	canvas.width = PHOTO_SIZE;
	canvas.height = PHOTO_SIZE;

	const context = canvas.getContext('2d');
	if (!context) throw new Error('Canvas unavailable');

	// Centre crop to a square, then scale down.
	context.drawImage(
		bitmap,
		(bitmap.width - side) / 2,
		(bitmap.height - side) / 2,
		side,
		side,
		0,
		0,
		PHOTO_SIZE,
		PHOTO_SIZE
	);
	bitmap.close();

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, 'image/jpeg', 0.85)
	);
	if (!blob) throw new Error('Couldn’t read that photo');
	return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
}
