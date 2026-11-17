import { fail, redirect } from '@sveltejs/kit';
import {
	addListItem,
	deleteList,
	deleteListItem,
	getList,
	ITEM_NAME_MAX,
	parseListName,
	renameList,
	setListItemChecked
} from '#lib/features/lists/lists.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	return { list: await getList(locals, params.id) };
};

export const actions: Actions = {
	add: async ({ request, locals, params }) => {
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (!name) return fail(400, { message: 'Type something to add.' });
		if (name.length > ITEM_NAME_MAX)
			return fail(400, { message: `Keep it under ${ITEM_NAME_MAX} characters.` });
		await addListItem(locals, params.id, name);
	},

	setChecked: async ({ request, locals }) => {
		const form = await request.formData();
		const itemId = String(form.get('itemId') ?? '');
		if (!itemId) return fail(400, { message: 'Missing item.' });
		await setListItemChecked(locals, itemId, form.get('checked') === 'true');
	},

	deleteItem: async ({ request, locals }) => {
		const itemId = String((await request.formData()).get('itemId') ?? '');
		if (!itemId) return fail(400, { message: 'Missing item.' });
		await deleteListItem(locals, itemId);
	},

	rename: async ({ request, locals, params }) => {
		const { name, errors, valid } = parseListName(await request.formData());
		if (!valid) return fail(400, { renameErrors: errors, name });
		await renameList(locals, params.id, name);
		return { renamed: true };
	},

	delete: async ({ locals, params }) => {
		await deleteList(locals, params.id);
		redirect(303, '/lists');
	}
};
