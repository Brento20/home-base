import { error } from '@sveltejs/kit';
import { getAccountDetails } from '#lib/features/account/account.server.js';
import { listBlocked, listFriends } from '#lib/features/friends/friends.server.js';
import { getHousehold } from '#lib/features/household/household.server.js';
import { listNotes } from '#lib/features/notes/notes.server.js';
import { todayISO } from '#lib/time.js';
import type { RequestHandler } from './$types';

/**
 * Everything you can see in home base, as one JSON file: your profile, your friends and anyone
 * you've blocked, and your home's tasks, lists, plans, money, recipes, feed, postcards, house-sitter
 * links and notes (secret notes opened). Row-level security
 * decides what each table gives back, so this is exactly what the app itself can show you.
 * Photos are listed by their storage path; the pictures themselves stay where they are.
 */

const TABLES = [
	'tasks',
	'lists',
	'list_items',
	'plans',
	'dinner_checkins',
	'recipes',
	'recipe_ratings',
	'expense_groups',
	'expense_group_members',
	'expenses',
	'expense_shares',
	'settlements',
	'feed_posts',
	'feed_replies',
	'feed_reactions',
	'postcards',
	'sitter_links'
] as const;

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user && !locals.sampleMode) error(401, 'Sign in to download your data.');

	const [account, notes, friends, blocked] = await Promise.all([
		getAccountDetails(locals),
		locals.householdId || locals.sampleMode ? listNotes(locals) : [],
		listFriends(locals),
		listBlocked(locals)
	]);

	const home =
		locals.householdId || locals.sampleMode
			? await getHousehold(locals).then(({ household }) => ({
					name: household.name,
					timeZone: locals.home.timeZone,
					currency: locals.home.currency,
					people: household.members.map((person) => ({
						name: person.displayName,
						owner: household.ownerIds.includes(person.id)
					}))
				}))
			: null;

	const tables: Record<string, unknown[]> = {};
	if (locals.supabase && locals.householdId) {
		const results = await Promise.all(
			TABLES.map((table) => locals.supabase!.from(table).select('*'))
		);
		results.forEach(({ data, error: readError }, index) => {
			if (readError) console.error('[export]', TABLES[index], readError);
			tables[TABLES[index]] = data ?? [];
		});
	}

	const body = {
		exportedAt: new Date().toISOString(),
		account,
		home,
		friends: friends.map(({ name, homeName, friendsSince }) => ({ name, homeName, friendsSince })),
		blocked: blocked.map(({ name }) => name),
		notes: notes.map(({ title, body, isSecret, updatedAt, locked }) => ({
			title,
			body: locked ? null : body,
			secret: isSecret,
			updatedAt
		})),
		...tables
	};

	return new Response(JSON.stringify(body, null, '\t'), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="home-base-${todayISO()}.json"`,
			'cache-control': 'no-store'
		}
	});
};
