import { zonedParts } from '#lib/time.js';
import type { Plan, Task } from '#lib/types.js';

/**
 * Merges plans and due chores into one timeline for Today's swipeable row.
 */

export type ComingUpItem =
	{ kind: 'plan'; id: string; plan: Plan } | { kind: 'task'; id: string; task: Task };

/** Household-local "YYYY-MM-DD HH:MM", so plans and chores sort on one timeline. */
function sortKey(item: ComingUpItem) {
	if (item.kind === 'task') return `${item.task.dueOn} 00:00`;
	const { date, time } = zonedParts(new Date(item.plan.startsAt));
	return `${date} ${item.plan.allDay ? '00:00' : time}`;
}

/**
 * Plans and due chores in one timeline. A chore due on a day sits at the start of that day,
 * so today's chores come before tonight's dinner; overdue chores come first of all.
 */
export function mergeComingUp(plans: Plan[], tasks: Task[], limit = 8): ComingUpItem[] {
	const items: ComingUpItem[] = [
		...tasks.map((task) => ({ kind: 'task' as const, id: `task-${task.id}`, task })),
		...plans.map((plan) => ({ kind: 'plan' as const, id: `plan-${plan.id}`, plan }))
	];
	return items
		.sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || (a.kind === 'task' ? -1 : 1))
		.slice(0, limit);
}
