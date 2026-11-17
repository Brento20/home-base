/**
 * Shrinks a chosen photo in the browser before it's uploaded. Re-drawing it also drops the hidden
 * data phones attach, including where it was taken.
 */

const AVATAR_SIZE = 512;
/** Feed photos: the long side, enough for a phone screen at 2–3× without a slow upload. */
const POST_LONG_SIDE = 1600;

async function draw(
	file: File,
	size: (bitmap: ImageBitmap) => {
		sx: number;
		sy: number;
		sw: number;
		sh: number;
		w: number;
		h: number;
	},
	name: string
): Promise<File> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	const { sx, sy, sw, sh, w, h } = size(bitmap);
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;

	const context = canvas.getContext('2d');
	if (!context) throw new Error('Canvas unavailable');
	context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
	bitmap.close();

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, 'image/jpeg', 0.85)
	);
	if (!blob) throw new Error('Couldn’t read that photo');
	return new File([blob], name, { type: 'image/jpeg' });
}

/** A 512 px square JPEG, centre-cropped: for profile photos. */
export function resizePhoto(file: File): Promise<File> {
	return draw(
		file,
		(bitmap) => {
			const side = Math.min(bitmap.width, bitmap.height);
			return {
				sx: (bitmap.width - side) / 2,
				sy: (bitmap.height - side) / 2,
				sw: side,
				sh: side,
				w: AVATAR_SIZE,
				h: AVATAR_SIZE
			};
		},
		'avatar.jpg'
	);
}

/** The whole photo as a JPEG no longer than 1600 px on its long side: for feed posts. */
export function shrinkPhoto(file: File): Promise<File> {
	return draw(
		file,
		(bitmap) => {
			const scale = Math.min(1, POST_LONG_SIDE / Math.max(bitmap.width, bitmap.height));
			return {
				sx: 0,
				sy: 0,
				sw: bitmap.width,
				sh: bitmap.height,
				w: Math.round(bitmap.width * scale),
				h: Math.round(bitmap.height * scale)
			};
		},
		'photo.jpg'
	);
}
