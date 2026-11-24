import { DEFAULT_DINNER_TIME } from '#lib/features/recipes/recipe.js';
import { daysBetween, formatDayLabel, formatDinnerWhen, zonedParts } from '#lib/time.js';
import type { Plan, Task } from '#lib/types.js';

/**
 * Merges plans, dinners and due chores into one timeline for Today’s swipeable row.
 */

export type ComingUpItem =
	{ kind: 'plan'; id: string; plan: Plan } | { kind: 'task'; id: string; task: Task };

/** Household-local "YYYY-MM-DD HH:MM", so plans, dinners and chores sort on one timeline. */
function sortKey(item: ComingUpItem) {
	if (item.kind === 'task') {
		const fallback = item.task.recipeId ? DEFAULT_DINNER_TIME : '00:00';
		return `${item.task.dueOn} ${item.task.dueTime ?? fallback}`;
	}
	const { date, time } = zonedParts(new Date(item.plan.startsAt));
	return `${date} ${item.plan.allDay ? '00:00' : time}`;
}

/** At the same minute, chores come before plans; otherwise the order they arrived in stays. */
const kindOrder = (item: ComingUpItem) => (item.kind === 'task' ? 0 : 1);

const isChore = (item: ComingUpItem) => item.kind === 'task' && !item.task.recipeId;

/**
 * Plans, dinners and due chores in one timeline. A chore due on a day sits at the start of
 * that day, so today's chores come before tonight's dinner; overdue chores come first of all.
 * A dinner with no time sits at 7pm. When there are more than `limit`, the latest chores give
 * way first, so a plan or a dinner someone scheduled is never pushed off the row by chores.
 */
export function mergeComingUp(plans: Plan[], tasks: Task[], limit = 8): ComingUpItem[] {
	const items: ComingUpItem[] = [
		...tasks.map((task) => ({ kind: 'task' as const, id: `task-${task.id}`, task })),
		...plans.map((plan) => ({ kind: 'plan' as const, id: `plan-${plan.id}`, plan }))
	].sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || kindOrder(a) - kindOrder(b));

	const keep = new Set(items.slice(0, limit));
	for (const item of items.slice(limit)) {
		if (isChore(item)) continue;
		// A plan or dinner past the cut takes the place of the latest chore that made it.
		const chore = [...keep].reverse().find(isChore);
		if (!chore) break;
		keep.delete(chore);
		keep.add(item);
	}
	return items.filter((item) => keep.has(item));
}

/**
 * When a chore or dinner is due, as its card or row says it: "Today", "Overdue by 3 days",
 * "Tonight, 6:30 pm". Shared by the cards and the compact list, so both say the same.
 */
export function taskWhen(task: Task, today: string): { label: string; late: boolean } {
	if (task.recipe)
		return { label: formatDinnerWhen(task.dueOn!, task.dueTime, today), late: false };
	const daysLate = task.dueOn ? -daysBetween(today, task.dueOn) : 0;
	if (daysLate > 0)
		return {
			label: daysLate === 1 ? 'Overdue since yesterday' : `Overdue by ${daysLate} days`,
			late: true
		};
	return { label: formatDayLabel(task.dueOn!, today), late: false };
}

/** A dinner can only be marked cooked from its day on; a chore can be ticked off any time. */
export const canFinish = (task: Task, today: string) =>
	!task.recipe || (task.dueOn !== null && task.dueOn <= today);
