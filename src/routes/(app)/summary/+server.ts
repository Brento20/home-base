import { json } from '@sveltejs/kit';
import { friendlyLine, loadWeekSummary } from '#lib/features/today/week.server.js';
import { aiConfigured } from '#lib/server/ai.js';
import type { RequestHandler } from './$types';

/**
 * The friendly version of Today's week line. Today shows the plain line straight away and asks
 * here after it loads. The facts are worked out again here from the database, never taken from
 * the browser. `line` is null when the AI is off or fails: Today just keeps the plain line.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { facts, plain, key } = await loadWeekSummary(locals);
	const line = aiConfigured ? await friendlyLine(facts, plain) : null;
	return json({ key, line }, { headers: { 'cache-control': 'private, no-store' } });
};
