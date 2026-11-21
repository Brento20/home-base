import { json } from '@sveltejs/kit';
import {
	PLANS_PAGE,
	PLANS_PAGE_MAX,
	listUpcomingPlansPage
} from '#lib/features/plans/plans.server.js';
import type { RequestHandler } from './$types';

/**
 * Later plans for the Plans list: GET /plans/later?offset=30&limit=30.
 * Returns { plans, hasMore }. Not cached: plans change.
 */
export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	const whole = (name: string, fallback: number) => {
		const value = Number(url.searchParams.get(name) ?? fallback);
		return Number.isInteger(value) && value >= 0 ? value : fallback;
	};
	const limit = Math.min(Math.max(whole('limit', PLANS_PAGE), 1), PLANS_PAGE_MAX);
	setHeaders({ 'cache-control': 'private, no-store' });
	return json(await listUpcomingPlansPage(locals, whole('offset', 0), limit));
};
