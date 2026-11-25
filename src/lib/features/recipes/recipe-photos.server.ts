import { error } from '@sveltejs/kit';
import { getHouseholdId } from '#lib/features/household/household.server.js';
import { photoExtension, photoProblem, toBase64 } from '#lib/features/feed/photo-rules.js';
import { dbError } from '#lib/server/db.js';
import { sampleRecipePhotos } from '#lib/server/sample-data.js';

/**
 * A photo for any recipe the home cooks, its own or the library's (public.recipe_photos, one
 * per recipe). Files live in the private recipe-photos bucket as <household id>/<file id>.jpg
 * and are served by routes/(app)/dinner/[id]/photo with the viewer's own session. The file id
 * goes in the address (?v=), so a new photo is a new address and the old one can be kept by the
 * browser for good. Sample mode keeps photos in memory as data URLs.
 */

const BUCKET = 'recipe-photos';

/** Library ids (recipe_012) and a home's own recipes (uuids). */
const RECIPE_ID = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|recipe_\d{3})$/;

export const isRecipeId = (id: string) => RECIPE_ID.test(id);

const photoUrl = (recipeId: string, path: string) =>
	`/dinner/${recipeId}/photo?v=${path.split('/')[1]?.split('.')[0] ?? ''}`;

/** Every recipe photo the home has, as recipe id → address. */
export async function listRecipePhotos(locals: App.Locals): Promise<Map<string, string>> {
	const { supabase } = locals;
	if (!supabase) return new Map(sampleRecipePhotos);

	const { data, error: readError } = await supabase
		.from('recipe_photos')
		.select('recipe_id, photo_path');
	if (readError) dbError(readError);
	return new Map(
		(data ?? []).map((row) => [row.recipe_id as string, photoUrl(row.recipe_id, row.photo_path)])
	);
}

/** One recipe's photo address, or null. */
export async function getRecipePhotoUrl(locals: App.Locals, recipeId: string) {
	const { supabase } = locals;
	if (!supabase) return sampleRecipePhotos.get(recipeId) ?? null;
	if (!isRecipeId(recipeId)) return null;

	const { data, error: readError } = await supabase
		.from('recipe_photos')
		.select('photo_path')
		.eq('recipe_id', recipeId)
		.maybeSingle();
	if (readError) dbError(readError);
	return data ? photoUrl(recipeId, data.photo_path) : null;
}

/** The photo file itself, for the photo route: only for people in the home. */
export async function readRecipePhoto(locals: App.Locals, recipeId: string) {
	const { supabase } = locals;
	if (!supabase || !isRecipeId(recipeId)) return null;
	const { data } = await supabase
		.from('recipe_photos')
		.select('photo_path')
		.eq('recipe_id', recipeId)
		.maybeSingle();
	if (!data) return null;
	const { data: file } = await supabase.storage.from(BUCKET).download(data.photo_path);
	return file ?? null;
}

/** The photo from a form, if one was chosen: null when none was, a message when it won't do. */
export function photoFromForm(form: FormData): { photo: File | null; problem: string | null } {
	const upload = form.get('photo');
	const photo = upload instanceof File && upload.size > 0 ? upload : null;
	return { photo, problem: photoProblem(photo) };
}

/** Puts a photo on a recipe, replacing any it had. */
export async function saveRecipePhoto(locals: App.Locals, recipeId: string, photo: File) {
	if (!isRecipeId(recipeId)) error(404, 'That recipe isn’t in the library.');
	const problem = photoProblem(photo);
	if (problem) error(400, problem);

	const { supabase } = locals;
	if (!supabase) {
		const bytes = new Uint8Array(await photo.arrayBuffer());
		sampleRecipePhotos.set(recipeId, `data:${photo.type};base64,${toBase64(bytes)}`);
		return;
	}

	const householdId = await getHouseholdId(locals);
	const { data: before } = await supabase
		.from('recipe_photos')
		.select('photo_path')
		.eq('recipe_id', recipeId)
		.maybeSingle();

	const path = `${householdId}/${crypto.randomUUID()}.${photoExtension(photo.type)}`;
	const { error: uploadError } = await supabase.storage
		.from(BUCKET)
		.upload(path, photo, { contentType: photo.type, upsert: false });
	if (uploadError) {
		console.error('[recipe photos] upload', uploadError);
		error(500, 'That photo didn’t upload. Try again.');
	}

	const { error: saveError } = await supabase
		.from('recipe_photos')
		.upsert(
			{ household_id: householdId, recipe_id: recipeId, photo_path: path },
			{ onConflict: 'household_id,recipe_id' }
		);
	if (saveError) {
		await supabase.storage.from(BUCKET).remove([path]);
		dbError(saveError);
	}
	// The old file only once the new one is in place, so the recipe is never left without one.
	if (before?.photo_path) await supabase.storage.from(BUCKET).remove([before.photo_path]);
}

/** Takes a recipe's photo off, file and all. */
export async function removeRecipePhoto(locals: App.Locals, recipeId: string) {
	const { supabase } = locals;
	if (!supabase) {
		sampleRecipePhotos.delete(recipeId);
		return;
	}
	if (!isRecipeId(recipeId)) return;

	const { data } = await supabase
		.from('recipe_photos')
		.select('photo_path')
		.eq('recipe_id', recipeId)
		.maybeSingle();
	if (!data) return;
	await supabase.storage.from(BUCKET).remove([data.photo_path]);
	const { error: deleteError } = await supabase
		.from('recipe_photos')
		.delete()
		.eq('recipe_id', recipeId);
	if (deleteError) dbError(deleteError);
}
