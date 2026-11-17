import { error } from '@sveltejs/kit';
import { getHouseholdId } from '#lib/features/household/household.server.js';
import { sampleProfiles, sampleTasks } from '#lib/server/sample-data.js';
import { startOfWeekISO, zonedToInstant } from '#lib/time.js';
import type { Score } from '#lib/types.js';

/**
 * One point for every task you tick off, counted from who completed each task. Undo removes
 * the completion, so it takes the point back too. Weeks start on Monday, household time.
 */
export async function getScores(locals: App.Locals): Promise<Score[]> {
	const { supabase } = locals;
	if (!supabase) {
		const weekStart = zonedToInstant(startOfWeekISO()).toISOString();
		return sampleProfiles.map((person) => {
			const done = sampleTasks.filter((task) => task.completedAt && task.completedBy === person.id);
			return {
				profileId: person.id,
				thisWeek: done.filter((task) => task.completedAt! >= weekStart).length,
				allTime: done.length
			};
		});
	}

	const householdId = await getHouseholdId(locals);
	const { data, error: rpcError } = await supabase.rpc('household_scores', {
		target_household: householdId
	});
	if (rpcError) error(500, rpcError.message);

	return ((data ?? []) as { profile_id: string; this_week: number; all_time: number }[]).map(
		(row) => ({
			profileId: row.profile_id,
			thisWeek: Number(row.this_week),
			allTime: Number(row.all_time)
		})
	);
}
