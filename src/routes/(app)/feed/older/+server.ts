import { error, json } from '@sveltejs/kit';
import { FEED_MAX, FEED_PAGE, listFeed } from '#lib/features/feed/feed.server.js';
import type { RequestHandler } from './$types';

/**
 * Older feed posts for Today, a few at a time: GET /feed/older?before=<ISO time>&limit=5.
 * Returns { posts, hasMore }. Not cached: replies and reactions change.
 */
export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	const before = url.searchParams.get('before') ?? '';
	if (Number.isNaN(Date.parse(before))) error(400, 'Say which post to load from.');
	const asked = Number(url.searchParams.get('limit') ?? FEED_PAGE);
	const limit = Number.isInteger(asked) && asked > 0 ? Math.min(asked, FEED_MAX) : FEED_PAGE;

	setHeaders({ 'cache-control': 'private, no-store' });
	return json(await listFeed(locals, limit, new Date(before).toISOString()));
};
