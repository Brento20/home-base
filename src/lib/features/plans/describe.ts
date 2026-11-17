import { formatClock, formatDayLabel, todayISO, zonedParts } from '#lib/time.js';
import type { Plan } from '#lib/types.js';

/** "7:00 pm", "7:00 pm – 11:00 pm", "9:00 pm – 6:00 am" (overnight) or "All day". */
export function describePlanTime(plan: Plan) {
	if (plan.allDay) {
		if (!plan.endsAt) return 'All day';
		// Multi-day: endsAt is the midnight after the last day.
		const last = new Date(new Date(plan.endsAt).getTime() - 1);
		return `All day until ${formatDayLabel(zonedParts(last).date)}`;
	}
	const start = formatClock(new Date(plan.startsAt));
	return plan.endsAt ? `${start} – ${formatClock(new Date(plan.endsAt))}` : start;
}

/** For Today's card: "7:00 pm" today, "Tomorrow · 9:00 am", "Saturday · All day". */
export function describePlanWhen(plan: Plan, today = todayISO()) {
	const day = zonedParts(new Date(plan.startsAt)).date;
	const time = plan.allDay ? 'All day' : formatClock(new Date(plan.startsAt));
	return day === today ? time : `${formatDayLabel(day, today)} · ${time}`;
}

export function planDay(plan: Plan) {
	return zonedParts(new Date(plan.startsAt)).date;
}

/** Plans grouped under day headings, in order. */
export function groupPlansByDay(plans: Plan[], today = todayISO()) {
	const groups: { day: string; label: string; plans: Plan[] }[] = [];
	for (const plan of plans) {
		const day = planDay(plan);
		let group = groups.at(-1);
		if (!group || group.day !== day) {
			group = { day, label: formatDayLabel(day, today), plans: [] };
			groups.push(group);
		}
		group.plans.push(plan);
	}
	return groups;
}
