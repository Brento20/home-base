import { fail, redirect } from '@sveltejs/kit';
import { toBase64 } from '#lib/features/feed/photo-rules.js';
import { importRecipe } from '#lib/features/recipes/import.server.js';
import { photoFromForm, saveRecipePhoto } from '#lib/features/recipes/recipe-photos.server.js';
import { createRecipe, parseRecipeForm } from '#lib/features/recipes/recipes.server.js';
import { aiConfigured } from '#lib/server/ai.js';
import type { Actions } from './$types';

/** A chosen photo, sent back with a form that needs fixing so it isn't lost. */
async function asDataUrl(photo: File | null) {
	if (!photo) return null;
	return `data:${photo.type};base64,${toBase64(new Uint8Array(await photo.arrayBuffer()))}`;
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const { input, errors, values, valid } = parseRecipeForm(form);
		const { photo, problem } = photoFromForm(form);
		if (!valid || problem) {
			return fail(400, {
				values,
				errors: problem ? { ...errors, photo: problem } : errors,
				photo: problem ? null : await asDataUrl(photo)
			});
		}
		const id = await createRecipe(locals, input);
		if (photo) {
			// The recipe is saved either way; a photo that didn't make it can be added from the recipe.
			const saved = await saveRecipePhoto(locals, id, photo).then(
				() => true,
				(reason) => (console.error('[recipes] photo on create', reason), false)
			);
			if (!saved) redirect(303, `/dinner/${id}?photo=failed`);
		}
		redirect(303, `/dinner/${id}`);
	},

	/** The import box: fills the form for checking, or says to fill it in by hand. */
	import: async ({ request }) => {
		if (!aiConfigured) return { assist: 'failed' as const };
		const imported = await importRecipe(await request.formData());
		if (!imported) return { assist: 'failed' as const };
		if ('problem' in imported) {
			return { assist: 'failed' as const, problem: imported.problem, site: imported.site };
		}
		return {
			assist: 'filled' as const,
			values: imported.values,
			source: imported.source,
			photo: imported.photo ?? null
		};
	}
};
